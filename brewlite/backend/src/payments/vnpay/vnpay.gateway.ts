import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  buildPaymentUrl,
  PAY_LINK_TTL_MS,
  SANDBOX_API_URL,
  SANDBOX_PAY_URL,
  signQueryRequest,
  verifyQueryResponse,
  verifySignature,
  VNP_VERSION,
  vnpDate,
  VnpParams,
} from './vnpay.util';

/** Cấu hình lấy từ backend/.env (TmnCode và HashSecret có trong email VNPay gửi khi đăng ký sandbox) */
export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;
  apiUrl: string;
  returnUrl: string;
}

export function readVnpayConfig(env: NodeJS.ProcessEnv = process.env): VnpayConfig | null {
  const tmnCode = env.VNP_TMN_CODE?.trim();
  const hashSecret = env.VNP_HASH_SECRET?.trim();
  if (!tmnCode || !hashSecret) return null;
  return {
    tmnCode,
    hashSecret,
    payUrl: env.VNP_URL?.trim() || SANDBOX_PAY_URL,
    apiUrl: env.VNP_API_URL?.trim() || SANDBOX_API_URL,
    returnUrl: env.VNP_RETURN_URL?.trim() || `${env.FRONTEND_URL ?? 'http://localhost:3000'}/payment/vnpay-return`,
  };
}

export interface CreatedLink {
  url: string;
  params: VnpParams;
  createDate: string;
  expiresAt: Date;
}

/** Lớp nói chuyện với VNPay: tạo link đã ký, kiểm tra chữ ký trả về, gọi API truy vấn giao dịch (querydr) */
export class VnpayGateway {
  constructor(
    readonly config: VnpayConfig | null,
    private readonly http: typeof fetch = fetch,
  ) {}

  get configured(): boolean {
    return this.config !== null;
  }

  private require(): VnpayConfig {
    if (!this.config) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình VNPay: điền VNP_TMN_CODE và VNP_HASH_SECRET (trong email đăng ký sandbox VNPay) vào backend/.env rồi chạy lại backend',
      );
    }
    return this.config;
  }

  createPaymentLink(input: { txnRef: string; amount: number; orderInfo: string; ipAddr: string; now: Date }): CreatedLink {
    const c = this.require();
    const createDate = vnpDate(input.now);
    const expiresAt = new Date(input.now.getTime() + PAY_LINK_TTL_MS);
    const params: VnpParams = {
      vnp_Version: VNP_VERSION,
      vnp_Command: 'pay',
      vnp_TmnCode: c.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: input.orderInfo, // không dấu, không ký tự đặc biệt
      vnp_OrderType: 'other',
      vnp_Amount: String(input.amount * 100), // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: c.returnUrl,
      vnp_IpAddr: input.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: vnpDate(expiresAt),
    };
    return { url: buildPaymentUrl(c.payUrl, params, c.hashSecret), params, createDate, expiresAt };
  }

  verify(query: Record<string, unknown>) {
    return verifySignature(query, this.require().hashSecret);
  }

  /** Hỏi lại VNPay trạng thái thật của giao dịch (API querydr), dùng để đối soát khi không nhận được IPN */
  async query(input: { txnRef: string; transactionDate: string; ipAddr: string; now: Date }) {
    const c = this.require();
    const request: Record<string, string> = {
      vnp_RequestId: randomUUID().replace(/-/g, ''),
      vnp_Version: VNP_VERSION,
      vnp_Command: 'querydr',
      vnp_TmnCode: c.tmnCode,
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: `Truy van giao dich ${input.txnRef}`,
      vnp_TransactionDate: input.transactionDate,
      vnp_CreateDate: vnpDate(input.now),
      vnp_IpAddr: input.ipAddr,
    };
    let body: unknown;
    try {
      const res = await this.http(c.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, vnp_SecureHash: signQueryRequest(request, c.hashSecret) }),
        signal: AbortSignal.timeout(15_000),
      });
      body = await res.json();
    } catch (err) {
      throw new BadGatewayException(`Không gọi được API truy vấn của VNPay: ${(err as Error).message}`);
    }
    if (!body || typeof body !== 'object') throw new BadGatewayException('VNPay trả về dữ liệu không đọc được');
    const data = body as Record<string, unknown>;
    return { request, data, valid: verifyQueryResponse(data, c.hashSecret) };
  }
}
