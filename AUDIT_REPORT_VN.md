# 🏦 Báo cáo Kiểm toán Backend Toàn diện: Hệ thống Quản lý Cầm đồ Việt Nam

## Tóm tắt Điều hành

Báo cáo này đánh giá codebase **se100-be-pawn-manager** dựa trên các tiêu chuẩn ngành và quy định pháp lý của Việt Nam (Nghị định 96/2016/NĐ-CP và Bộ luật Dân sự 2015). Mặc dù hệ thống sở hữu tech stack hiện đại (NestJS, Prisma, PostgreSQL, Clerk, Cloudinary), nhưng vẫn tồn tại những lỗ hổng nghiêm trọng về tuân thủ quy định, khả năng kiểm toán (auditability) và việc hoàn thiện vòng đời tài sản thế chấp.

---

---

---

## Giai đoạn 0: Cấu trúc Cơ sở & Liên kết Module (Customer-Centric Model)

### 🧩 Nhận định Kiến trúc
Hệ thống hiện tại xoay quanh **`Customer`** là thực thể trung tâm, và mỗi **`Loan`** (Khoản vay) đại diện cho một Hợp đồng độc lập. Quan điểm này là **CHÍNH XÁC** và tối ưu cho quản lý: một Khách hàng có thể có nhiều Khoản vay (nhiều hợp đồng), và mỗi Khoản vay có thể có nhiều Tài sản.

### 🔍 Giải pháp cho "Gia hạn" (Extension)
Thay vì tạo entity `Contract` cha phức tạp, ta sẽ xử lý nghiệp vụ "Gia hạn" theo mô hình **Tái cấp vốn (Refinancing)**:
- **Hiện tại:** User cố "sửa" kỳ trả nợ của Loan cũ (gây lỗi logic).
- **Kiến trúc Đề xuất:**
  1.  **Gia hạn = Khoản vay Mới:** Khi khách muốn gia hạn, hệ thống sẽ:
      *   Tạo `Loan` Mới (StartDate = hôm nay).
      *   Dùng tiền giải ngân của Loan Mới để **Payment (Payoff)** cho Loan Cũ.
      *   Đóng Loan Cũ (`Status = CLOSED`).
  2.  **Lợi ích:**
      *   Giữ nguyên nguyên tắc "1 Loan = 1 Hợp đồng".
      *   Lịch sử tín dụng rõ ràng (Loan A đã đóng, Loan B đang chạy).
      *   Tự động tính lại lãi suất/phí mới nhất cho kỳ gia hạn.

---

---

## Giai đoạn 1: Kiểm kê Tính năng - Cây Tính năng Hoàn chỉnh

### 📊 Tổng quan Kiến trúc Hiện tại

| Module | Routes | Services | Trạng thái |
|--------|--------|----------|--------|
| **Loan** (Khoản vay) | `/v1/loans` | `LoanOrchestrator`, `LoanService` | ✅ Đã triển khai |
| **Customer** (Khách hàng) | `/v1/customers` | `CustomerService` | ✅ Đã triển khai |
| **Collateral** (Tài sản) | `/v1/collateral-assets`, `/v1/liquidations` | `CollateralService` | ✅ Đã triển khai |
| **Payment** (Thanh toán) | `/v1/payments` | `PaymentService` | ✅ Đã triển khai |
| **Valuation** (Định giá) | `/v1/valuations` | `ValuationService`, `GeminiService` | ✅ Đã triển khai |
| **Employee** (Nhân viên) | `/v1/employees` | `EmployeeService` (Clerk-based) | ✅ Đã triển khai |
| **Repayment Schedule** | `/v1/repayment-schedules` | `RepaymentScheduleService`, `MarkOverdueProcessor` | ✅ Đã triển khai |
| **Loan Simulations** | `/v1/loan-simulations` | `LoanSimulationsService` | ✅ Đã triển khai |
| **Configurations** | `/v1/configurations` | `ConfigurationsService` | ✅ Đã triển khai |
| **Contract** (Hợp đồng) | `/v1/contracts` | `ContractService` | ⚠️ Chỉ có Stub (Rỗng) |

---

### 🌳 Chi tiết Cây Tính năng theo Danh mục

#### 1. **Loan Management (Quản lý Khoản vay)**
- **Loan Creation:** Tạo khoản vay chờ duyệt (pending) có liên kết tài sản.
- **Loan Approval/Rejection:** Chuyển đổi trạng thái (chỉ Manager) kèm ghi chú.
- **Loan Status Machine:** `PENDING → ACTIVE/REJECTED → OVERDUE → CLOSED`.
- **Loan Listing with Filters:** Lọc theo status, customerId, phân trang.
- **Loan Update (PENDING only):** Có thể sửa điều khoản trước khi duyệt.
- **Repayment Schedule Generation:** Tự động tạo lịch trả nợ khi tạo khoản vay.
- **Loan Simulation:** Xem trước lịch trả nợ.
- **Repayment Methods:** Hỗ trợ `EQUAL_INSTALLMENT` (Góp đều), `INTEREST_ONLY` (Lãi hàng tháng + Gốc cuối kỳ).
- **Tự động Phát hiện Quá hạn (Overdue Auto-Detection):** Cron job chạy hàng ngày để đánh dấu quá hạn & tính phạt.
  - *Cải thiện:* Hiện tại job này chạy ngầm (silently). Nó cần phải **Ghi Log** vào bảng `AuditLog` cho mỗi lần tính phạt.
- **Tính toán Phạt (Penalty Calculation):** Tính phạt theo ngày (pro-rata) dựa trên dư nợ gốc quá hạn.
- **Overdue API:** ❌ Thiếu Logic.
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Sửa Processor:** Cập nhật `mark-overdue.processor.ts` để chèn 1 record vào `AuditLog` (hoặc `NotificationLog`) cho mỗi khách bị phạt.
  > 2. **Thêm Endpoint:** Triển khai `GET /repayment-schedules/overdue` để trả về danh sách các mục đang `OVERDUE`. Dùng danh sách này cho tính năng "Call List".

#### 2. **Asset/Collateral Tracking (Theo dõi Tài sản)**
- **Collateral CRUD:** Tạo, Xem, Sửa với hình ảnh (Cloudinary).
- **Collateral Types:** `MOTORBIKE`, `CAR`, `GOLD`, mở rộng qua bảng `CollateralType`.
- **Collateral Status Lifecycle:** `PROPOSED → PLEDGED → STORED → RELEASED/LIQUIDATING → SOLD`.
- **Location Tracking:** Gán Kho/Cửa hàng lưu trữ.
- **Appraisal Values:** `appraisedValue`, `ltvRatio`, `appraisalNotes`.
- **AI Valuation:** Định giá thị trường bằng Gemini AI.
- **Liquidation Initiation:** Có thể bắt đầu thanh lý cho khoản vay OVERDUE.
- **Liquidation Completion:** ❌ Thiếu Logic (Xem hướng dẫn bên dưới).
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Chặn Validate DTO:** Enum logic `AssetStatus` (dùng trong DTO) hiện đang thiếu giá trị `LIQUIDATING` và `SOLD`, gây lỗi validation `zod` dù Database có hỗ trợ.
  > 2. **Thiếu Side-Effect (Đóng khoản vay):** Việc đánh dấu tài sản là `SOLD` phải kích hoạt tự động việc chuyển `Loan` từ `OVERDUE` → `CLOSED` (Tất toán nợ). Không được dựa vào các update CRUD thông thường cho việc này.

#### 3. **Customer (KYC)**
- **Customer CRUD:** Vòng đời đầy đủ với validate.
- **National ID Storage:** ⚠️ Một phần (Lưu chuỗi string, chưa validate định dạng CCCD 12 số).
- **ID Photo Storage:** ✅ Đã triển khai (Trường JSON `images`).
- **Age Verification:** ✅ Đã triển khai (Phải trên 18 tuổi).
- **Duplicate Detection:** ✅ Đã triển khai (Check trùng `nationalId`, `phone`).
- **Customer Type:** ✅ Đã triển khai (`REGULAR`, `VIP`).
- **Monthly Income Tracking:** ✅ Đã triển khai (Bắt buộc, tối thiểu 3M VND).
- **KYC Document Separation:** ❌ Thiếu Logic (Xem hướng dẫn bên dưới).
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Rủi ro Tuân thủ:** Việc kiểm tra theo Nghị định 96 yêu cầu truy xuất nhanh Mặt trước vs Mặt sau CCCD. Một "túi ảnh" (mảng không nhãn) gây khó khăn và dễ lỗi.
  > 2. **Cấu trúc JSON:** Đổi nội dung JSON `images` từ mảng đơn giản sang cấu trúc có tag hoặc metadata.
  >    *   *Hiện tại:* `[{ "url": "..." }, { "url": "..." }]` (Mơ hồ)
  >    *   *Yêu cầu:* `[{ "type": "FRONT_ID", "url": "..." }, { "type": "BACK_ID", "url": "..." }]`

#### 4. **Financial Reporting (Báo cáo Tài chính)**
- **Payment Recording:** Theo dõi phân bổ thanh toán đầy đủ, có idempotency.
- **Payment Types:** `PERIODIC`, `EARLY`, `PAYOFF`, `ADJUSTMENT`.
- **Payment Methods:** `CASH`, `BANK_TRANSFER`.
- **Payment Allocation:** Thứ tự ưu tiên (Waterfall): Lãi → Phí → Phạt → Gốc.
- **Loan Balance Tracking:** Tính toán dư nợ còn lại theo thời gian thực.
- **Revenue Reports / Analytics:** ❌ Thiếu Logic (Xem hướng dẫn bên dưới).
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Phân tách Trách nhiệm:** `PaymentAllocation` theo dõi việc giảm nợ *vận hành* (Gốc/Lãi đã trả). Nó KHÔNG phù hợp cho báo cáo *tài chính* (Lãi/Lỗ).
  > 2. **Kiến trúc Đề xuất:** Tạo bảng riêng **`RevenueLedger`**.
  >    *   *Mục đích:* Ghi chép bất biến mọi dòng tiền vào/ra (Thu lãi, Thu phí, Tiền thanh lý).
  >    *   *Lợi ích:* Truy vấn báo cáo nhanh (`SELECT SUM(amount)`) mà không cần join các bảng lịch trả nợ phức tạp, và hỗ trợ các nguồn thu ngoài khoản vay (như Bán thanh lý).

---

## Giai đoạn 2: Phân tích Thiếu hụt (Gap Analysis) - Tuân thủ Pháp lý Việt Nam

### 🔴 Các Lỗ hổng Tuân thủ Nghiêm trọng

#### 2. Interest Payment & Debt Reminders ("Nhắc nợ & Đóng lãi")
- **Lỗ hổng Vận hành:** Hệ thống thiếu nhắc nhở tự động (SMS/Email) cho các kỳ đóng lãi sắp tới (ví dụ: "trước 3 ngày"), làm tăng tỷ lệ nợ quá hạn không mong muốn.
- **Lỗ hổng Service:** Không có quy trình cho nhân viên xem "Danh sách Gọi điện" (Call List) các khoản sắp đến hạn hoặc ghi lại kết quả gọi nhắc nợ (ví dụ: "Khách hứa thứ Hai đóng").
- **Mức độ:** **🔴 HIGH (Cao)**
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Hệ thống Tích hợp:** Mở rộng bảng `NotificationLog` (đề xuất bên dưới) để hỗ trợ loại `INTEREST_REMINDER`.
  > 2. **Lịch trình:**
  >    *   **Trước hạn:** Auto-SMS tại thời điểm -3 Ngày và Ngày đến hạn.
  >    *   **Sau hạn (Đòi nợ mềm):** Danh sách Gọi điện cho người (Human Call List) tại thời điểm +3 Ngày quá hạn.
  > 3. **Log Kết quả:** Nhân viên phải log được ngày "Khách hứa trả" (Promise to Pay), giúp tạm ẩn nhắc nhở để đảm bảo vận hành "Thiện chí".

#### 3. Collateral Liquidation Lifecycle ("Thanh lý tài sản")
- **Lỗ hổng Pháp lý (Thông báo 7 ngày):** Nghị định 96/2016 và BLDS 2015 yêu cầu thông báo và thời gian chờ (thường là 7 ngày) trước khi xử lý tài sản. Hệ thống hiện tại chuyển ngay từ Quá hạn sang Thanh lý mà không có quy trình này.
- **Lỗ hổng Service (Log Giao tiếp):** Không có hệ thống theo dõi "Nhắc nhở Tiền thanh lý" bắt buộc gửi cho khách. Cần bằng chứng pháp lý là đã cố gắng liên hệ.
- **Lỗ hổng Logic:** Bảng `Collateral` có `sellPrice` và `SOLD`, nhưng không có Service method nào update chúng.
- **Rủi ro Khoản vay Zombie:** Cron job hàng đêm (`mark-overdue.processor.ts`) update *kỳ trả nợ* thành OVERDUE nhưng **quên update trạng thái `Loan` cha**. Khoản vay vẫn `ACTIVE` dù nợ xấu, làm quản lý không thấy được rủi ro.
- **Thiếu Schema:** Không có bảng `LiquidationTransaction` để lưu P/L (Lãi/Lỗ) tách biệt khỏi sổ nợ vay.
- **Mức độ:** **🔴 HIGH (Cao)**
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Schema:** Thêm bảng `NotificationLog` (kênh: SMS, CALL, EMAIL; trạng thái: SENT, FAILED, ANSWERED, NO_ANSWER).
  > 2. **Quy trình (Workflow):** 
  >    *   **Ngày 1 Quá hạn:** Cron job gửi Auto-SMS + Logic kích hoạt "Call List" cho nhân viên.
  >    *   **Nhân viên xử lý:** Nhân viên gọi -> log kết quả vào hệ thống (vd: "Khách hứa mai trả" hoặc "Không nghe máy").
  >    *   **Ngày 7 Quá hạn:** Nếu không trả + không liên lạc được -> Hệ thống bật nút "Bắt đầu Thanh lý" (Check tuân thủ).
  > 3. **Fix Khoản vay Zombie:** Đảm bảo trạng thái `Loan` update thành `CLOSED` (hoặc `LIQUIDATED`) ngay khi tài sản được bán, tránh trạng thái "Đang vay nhưng đã bán xe".


#### 5. KYC & Vietnamese Identity (CCCD)
- **Lỗ hổng:** Schema cho phép 6-30 ký tự cho `nationalId` nhưng không ép đúng định dạng **CCCD 12 số** hoặc checksum.
- **Lỗ hổng Cấu trúc:** Schema dùng `Json` linh hoạt cho ảnh, nhưng logic app không ép tách biệt **Mặt trước và Mặt sau**.
- **Lỗ hổng:** Thiếu ngày cấp và nơi cấp (bắt buộc cho KYC).
- **Mức độ:** **🔴 HIGH (Cao)**
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Rủi ro Tuân thủ:** Nghị định 96 yêu cầu truy xuất nhanh Mặt trước vs Mặt sau. "Túi ảnh" không nhãn rất rủi ro.
  > 2. **Cấu trúc JSON:** Đổi sang cấu trúc có tag.
  >    *   *Hiện tại:* `[{ "url": "..." }, { "url": "..." }]`
  >    *   *Yêu cầu:* `[{ "type": "FRONT_ID", "url": "..." }, { "type": "BACK_ID", "url": "..." }]`

#### 6. Contract Generation ("Hợp đồng cầm đồ")
- **Lỗ hổng:** Module `Contract` đang rỗng (commented out). Không có template engine để tạo hợp đồng cầm đồ hợp lệ.
- **Lỗ hổng Dữ liệu:** `LoanMapper` hiện tại trả về object JSON lồng nhau. Thiếu **Logic Làm phẳng (Flattening)** để chuyển dữ liệu kỹ thuật (Hãng, Model, Serial) thành chuỗi đọc được trên hợp đồng in (vd: *"Xe máy Honda Vision, Biển số 59X-123.45"*).
- **Mức độ:** **🔴 HIGH (Cao)**
  > **👨‍💻 Hướng dẫn Kỹ thuật để Xác minh:**
  > 1. **Vấn đề:** Template in ấn (HTML/PDF) cần biến đơn giản `{{COLLATERAL_DESCRIPTION}}`, nhưng API lại trả về cây JSON sâu: `collaterals[0].collateralInfo.attributes.brand`.
  > 2. **Giải pháp:** Triển khai service `ContractDataFacade`.
  >    *   **Input:** Full Loan Entity (kèm quan hệ lồng nhau).
  >    *   **Xử lý:** "Làm phẳng" dữ liệu. Detect loại tài sản (Xe hay Điện thoại). Ghép chuỗi: `Brand + " " + Model + ", SN: " + Serial`.
  >    *   **Output:** Dictionary Key-Value đơn giản: `{ "CUSTOMER_NAME": "Nguyen Van A", "ASSET_LINE": "iPhone 15 Pro Max, 256GB, Gold" }`.

---
 
## Giai đoạn 3: Tính năng Tuân thủ Vật lý & Thủ công (Hỗ trợ Nghị định 96)

Vì không bắt buộc tích hợp API trực tiếp với Công an, hệ thống phải hỗ trợ **quy trình thủ công bắt buộc**.

### 📋 1. Hỗ trợ "Sổ Quản Lý" (Police Book)
- **Lỗ hổng:** Nhân viên phải chép tay từ màn hình sang Sổ Quản Lý đã đóng dấu.
- **Yêu cầu:** Màn hình **"Nhật Ký Hàng Ngày"** tối ưu cho việc chép lại.
  > **👨‍💻 Hướng dẫn Kỹ thuật:**
  > Tạo view `GET /admin/daily-log?date=YYYY-MM-DD` hiển thị chính xác các cột cần cho Sổ Công An (Tên khách, CCCD, ĐC, Mô tả TS, Ngày) dưới dạng danh sách nén để in/nhìn.

### 🏷️ 2. Lưu kho & Dán nhãn (Asset Tagging) (later)
- **Lỗ hổng:** Hàng trong kho phải dán Mã Hợp đồng để phục vụ kiểm tra đột xuất.
- **Yêu cầu:** Tính năng **"In Tem Tài sản"**.
  > **👨‍💻 Hướng dẫn Kỹ thuật:**
  > Thêm nút "In Tem Kho" trên màn hình Tài sản. Tạo PDF/Label nhỏ chứa: `Mã HĐ`, `Tên Khách`, `Ngày Nhận`.

### 📄 3. Báo cáo Quý (Mẫu ĐK13)
- **Lỗ hổng:** Chưa tự động tạo báo cáo tổng hợp quý.
- **Yêu cầu:** **"Xuất Mẫu ĐK13"**.
  > **👨‍💻 Hướng dẫn Kỹ thuật:**
  > Triển khai endpoint tổng hợp số lượng khoản vay, tổng giá trị, số lượng thanh lý theo đúng bố cục Mẫu ĐK13 để quản lý in và nộp cho Công an phường.

---

## 🛠️ Phụ lục: Hướng dẫn Triển khai Chi tiết (Technical Spec)

Dưới đây là hướng dẫn code-level cho tính năng **Overdue Tracking & Audit**.

### 1. Database Schema (`prisma/schema.prisma`)
Cần thêm bảng `AuditLog` để lưu lịch sử truy vết (AI Penalty, Nhân viên sửa đổi).

```prisma
// Thêm vào cuối file schema.prisma
model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  action       String   // e.g., "SYSTEM_PENALTY", "UPDATE_LOAN", "LIQUIDATION"
  entityId     String   // ID của đối tượng bị tác động (LoanID, RepaymentID)
  entityType   String   // "LOAN", "REPAYMENT_SCHEDULE"
  actorId      String?  // NULL nếu là SYSTEM (Cronjob), UserID nếu là nhân viên
  oldValue     Json?    // Dữ liệu trước khi thay đổi
  newValue     Json?    // Dữ liệu sau khi thay đổi
  description  String?  // "Applied penalty: 50,000 VND for 2 days overdue"
  createdAt    DateTime @default(now())
}
```

### 2. API Endpoints Mới (`repayment-schedule.controller.ts`)
Hiện tại module này thiếu endpoint để query danh sách quá hạn cho nhân viên gọi điện.

| Endpoint | Method | Input | Output | Mô tả |
|----------|--------|-------|--------|-------|
| `/v1/repayment-schedules/overdue` | `GET` | `?daysOverdue=3` | `List<RepaymentSchedule>` | Lấy danh sách các kỳ quá hạn > N ngày để Call. |
| `/v1/audit-logs/penalties` | `GET` | `?loanId=...` | `List<AuditLog>` | Xem lịch sử bị phạt của một khoản vay. |

### 3. Logic Cron Job (`mark-overdue.processor.ts`)
Sửa file processor để **Ghi Log** thay vì chạy ngầm.

*Logic Cần Sửa:*
```typescript
// Trong vòng lặp for (const item of candidates)
// ... sau khi tính toán penalty ...

await tx.repaymentScheduleDetail.update({ ... }); // Code cũ

// --> THÊM ĐOẠN NÀY:
await tx.auditLog.create({
  data: {
    action: 'SYSTEM_PENALTY',
    entityId: item.id,
    entityType: 'REPAYMENT_SCHEDULE',
    actorId: 'SYSTEM',
    description: `Auto-applied penalty: ${penalty} VND (Overdue ${overdueDays} days)`,
    oldValue: { penaltyAmount: item.penaltyAmount },
    newValue: { penaltyAmount: item.penaltyAmount + penalty }
  }
});
```

### 5. Logic Thanh lý (`Spec: Liquidation`)
Cần kiểm soát quy trình 7 ngày chặt chẽ.

*Workflow:*
1.  **Trigger:** Khoản vay quá hạn > 7 ngày.
2.  **Check:** Query `NotificationLog` xem đã gửi đủ 3 SMS/Call chưa?
3.  **Action:** API `POST /liquidations/initiate` -> Chuyển Status tài sản sang `LIQUIDATING`.
4.  **Completion:** API `POST /liquidations/complete` (Input: `soldPrice`).
    *   Update Tài sản -> `SOLD`.
    *   Update Loan -> `CLOSED` (Xóa nợ xấu).
    *   Ghi vào `RevenueLedger` (Type: LIQUIDATION_PROFIT).

### 6. Báo cáo Tài chính (`Spec: Revenue Ledger`)
Bảng này giúp query doanh thu cực nhanh cho Dashboard.

```prisma
model RevenueLedger {
  id        String   @id @default(uuid()) @db.Uuid
  type      String   // "INTEREST", "FEE", "LIQUIDATION_EXCESS"
  amount    Decimal
  refId     String   // LoanID hoặc PaymentID
  recordedAt DateTime @default(now())
}
```
*Cách dùng:* Khi `PaymentService` nhận tiền Lãi --> Insert 1 dòng vào đây.

### 7. View Sổ Quản Lý (`Spec: Police Book`)
Chỉ cần trả về JSON phẳng (Flat JSON) để Frontend dùng thư viện `react-to-print`.

*Query:*
```typescript
// GET /admin/daily-log
// Select: Customer.fullName, Customer.nationalId, Customer.address, Collateral.description
// Where: Loan.createdAt == date OR Loan.closedAt == date
```
*(Lưu ý: Sổ công an cần ghi cả ngày nhận cầm đồ VÀ ngày trả đồ)*


---

- **Hành động:** Thêm `LEGAL_INTEREST_CAP` vào `SystemParameter` và chặn/cảnh báo rủi ro khi tạo khoản vay.
- **Hành động:** Ép buộc KYC chặt chẽ: Tách biệt upload `FRONT_ID` và `BACK_ID` và validate định dạng CCCD 12 số.
- **Hành động:** Vá bảo mật: Áp dụng RBAC (`Role.MANAGER`) cho các endpoint Cấu hình và Thanh toán.

- **Hành động:** Xây dựng **Liquidation Engine**: Logic kiểm tra Thông báo 7 ngày -> Unlock nút "Bán" -> Đóng khoản vay khi Bán xong.
- **Hành động:** Xây dựng **Communication Log**: Tạo bảng `NotificationLog` và API "Call List" cho nhân viên.
- **Hành động:** Phát triển **Police Book View**: API `GET /admin/daily-log` chuẩn hóa để chép sổ tay.

- **Hành động:** Triển khai `ContractDataFacade` và template HTML để in "Hợp đồng cầm đồ".
- **Hành động:** Xây dựng endpoint xuất **Báo cáo Quý (ĐK13)**.
- **Hành động:** Tạo **Dashboard Doanh thu** dựa trên bảng `RevenueLedger` chuyên dụng.

---

