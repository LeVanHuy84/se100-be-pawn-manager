# Báo cáo Tiến độ Phát triển Dự án Pawn Manager

Tài liệu này tổng hợp chi tiết kết quả đã đạt được của dự án đến thời điểm hiện tại, bao gồm các công việc phân tích thiết kế, các chức năng đã hoàn thiện, chưa hoàn thiện và các chức năng đang ở mức giao diện/khung sườn.

## 1. Phân tích & Thiết kế (Analysis & Design)

Giai đoạn phân tích và thiết kế đã hoàn thành các hạng mục cốt lõi, tạo nền tảng vững chắc cho việc phát triển Backend:

*   **Thiết kế Cơ sở dữ liệu (Database Schema):**
    *   Đã hoàn thiện mô hình dữ liệu (ERD) thông qua **Prisma Schema**.
    *   Bao gồm các thực thể chính: `Loan` (Khoản vay), `Customer` (Khách hàng), `Collateral` (Tài sản), `RepaymentSchedule` (Lịch trả nợ), `Store` (Cửa hàng), và các bảng ghi nhận giao dịch tài chính (`RevenueLedger`, `Disbursement`).
*   **Biểu đồ Use Case (Use Case Diagrams):**
    *   Đã xây dựng biểu đồ Use Case tổng quan hệ thống (System Overview).
    *   Đã chi tiết hóa các Use Case cho nghiệp vụ quản lý khoản vay (Loan CRUD).
*   **Biểu đồ Lớp (Class Diagram):**
    *   Đã mô hình hóa các lớp đối tượng và quan hệ giữa chúng, bao gồm cả việc tích hợp với hệ thống bên ngoài (Clerk User).
*   **Biểu đồ Hoạt động (Activity Diagrams):**
    *   Đã thiết kế chi tiết luồng xử lý cho các tác vụ quan trọng: Tạo khoản vay, Duyệt vay, Cập nhật hồ sơ, và Xử lý quá hạn.

## 2. Các chức năng Đã hoàn chỉnh (Completed Features)

Các chức năng dưới đây đã có đầy đủ Controller (API), Service (Logic nghiệp vụ) và tương tác Database:

*   **Quản lý Khoản vay (Loan Management):**
    *   **Tạo mới:** Quy trình tạo hồ sơ vay hoàn chỉnh với Transaction (Tạo Loan -> Update Tài sản -> Tính toán lịch trả nợ -> Ghi Audit Log).
    *   **Mô phỏng (Simulation):** Tự động tính toán lãi suất, phí và lịch trả nợ dựa trên cấu hình hệ thống trước khi tạo hồ sơ.
    *   **Phê duyệt/Từ chối:** Chuyển trạng thái khoản vay (`PENDING` -> `ACTIVE`/`REJECTED`) có kiểm tra điều kiện chặt chẽ.
    *   **Tra cứu:** Tìm kiếm, lọc hồ sơ theo nhiều tiêu chí.
*   **Quản lý Tài chính & Báo cáo (Finance & Reporting):**
    *   **Báo cáo Doanh thu:** Tính toán chi tiết doanh thu theo ngày/tháng, phân loại nguồn thu (Lãi, Phí, Thanh lý).
    *   **Sổ quản lý (Police Book):** Xuất báo cáo nhật ký hoạt động (Vay mới/Đóng hợp đồng) phục vụ kiểm tra hành chính.
    *   **Báo cáo Quý (Compliance):** Tổng hợp số liệu thống kê hoạt động, tài sản tồn kho, tỷ lệ LTV trung bình theo mẫu báo cáo định kỳ.
*   **Quản lý Nhân viên & Xác thực (Auth & Employee):**
    *   Tích hợp hoàn toàn với **Clerk** để quản lý danh tính, phân quyền và thông tin nhân viên (StoreId, Role).
*   **Định giá Tài sản (Valuation):**
    *   Tích hợp **AI (Gemini Service)** để gợi ý giá thị trường cho tài sản (Xe máy, Ô tô, v.v.).
    *   Tính toán tỷ lệ khấu hao và hạn mức vay tối đa (LTV) dựa trên cấu hình.
*   **Quản lý Trả nợ (Repayment):**
    *   Xử lý các khoản thanh toán, phân bổ dòng tiền vào Lãi -> Phí -> Gốc.
    *   Truy vấn danh sách nợ quá hạn (Overdue) để phục vụ thu hồi nợ.

## 3. Các chức năng Chưa hoàn chỉnh (Incomplete Features)

Các chức năng này đã có logic cơ bản nhưng còn thiếu các mảnh ghép nâng cao hoặc chưa được kiểm thử toàn diện:

*   **Quản lý Hợp đồng (Contract Management):**
    *   Hiện tại logic sinh file hợp đồng (PDF/Word) hoặc quản lý văn bản hợp đồng đang bị **comment out** (tạm khóa) trong `ContractService`. Hệ thống chưa thực sự sinh ra văn bản pháp lý để in ấn.
*   **Thanh toán Online (Payment Gateway):**
    *   Hệ thống mới chỉ hỗ trợ ghi nhận thanh toán thủ công (`LoanPayment`).
    *   Chưa tích hợp cổng thanh toán thực tế (như VNPay, MoMo) để tự động xác nhận giao dịch ngân hàng (Webhook).
*   **Thông báo (Notification/Communication):**
    *   Đã có các Service gửi thông báo, nhưng cần tích hợp sâu hơn với các nhà cung cấp SMS Brandname hoặc Email Service thực tế (đang ở mức Logic lập lịch và ghi Log).

## 4. Các chức năng Chỉ có giao diện/API (Interface Only)

Đây là các chức năng đã được định nghĩa trong API (Controller/DTO) hoặc có Service nhưng chưa có xử lý nghiệp vụ thực tế (Logic rỗng hoặc bị vô hiệu hóa):

*   **Contract Service:** Như đã đề cập ở trên, toàn bộ code xử lý trong `ContractService` đang bị vô hiệu hóa (Commented out). API có thể vẫn tồn tại nhưng sẽ không trả về dữ liệu thực hoặc ném lỗi.
*   **Disbursement (Giải ngân):** Đã có ghi nhận lịch sử giải ngân (`DisbursementLog`), nhưng việc kết nối với API ngân hàng để **tự động chuyển khoản** cho khách hàng chưa được thực hiện (hiện tại chủ yếu là ghi nhận thao tác chi tiền mặt hoặc chuyển khoản thủ công).

## 5. Hạn chế (Limitations)

Dưới đây là những hạn chế còn tồn tại của đồ án trong phiên bản hiện tại:

1.  **Thiếu tích hợp thanh toán tự động (Automated Payments):**
    *   Hiện tại, việc thu tiền lãi/gốc hoàn toàn phụ thuộc vào nhân viên nhập liệu thủ công (Manual Entry) sau khi nhận tiền mặt hoặc chuyển khoản.
    *   Chưa tích hợp các cổng thanh toán (Payment Gateway) như VNPay, MoMo, hay ZaloPay, dẫn đến nguy cơ sai sót khi nhập liệu và khó khăn trong việc đối soát giao dịch thời gian thực.

2.  **Chưa có tính năng sinh Hợp đồng pháp lý (Legal Documents):**
    *   Module `Contract` chưa hoàn thiện tính năng sinh file PDF/Word từ mẫu hợp đồng (Template). Nhân viên vẫn phải soạn thảo hợp đồng bên ngoài, gây mất thời gian và thiếu sự đồng bộ dữ liệu.

3.  **Quản lý kho chưa tối ưu (Inventory Management):**
    *   Việc quản lý vị trí tài sản trong kho mới dừng lại ở việc lưu tên vị trí (String). Chưa có hệ thống quản lý kho chi tiết theo sơ đồ, mã vạch (Barcode/QR Code) để hỗ trợ kiểm kê nhanh tài sản vật lý.

4.  **Phụ thuộc hoàn toàn vào kết nối Internet:**
    *   Hệ thống được thiết kế theo kiến trúc Web-based và chưa hỗ trợ chế độ Offline. Trong trường hợp mất kết nối mạng, các cửa hàng sẽ bị gián đoạn hoạt động hoàn toàn (không thể tra cứu, tạo phiếu thu).

5.  **Hiệu năng Báo cáo (Reporting Performance):**
    *   Một số báo cáo tổng hợp (như Báo cáo Doanh thu) đang xử lý tính toán logic nhiều ở tầng Application (Node.js) thay vì tối ưu hóa truy vấn Database (Aggregation). Với lượng dữ liệu lớn (Big Data) trong tương lai, tốc độ xuất báo cáo có thể bị chậm.

6.  **Quy trình Giải ngân (Disbursement) còn thủ công:**
    *   Hệ thống chỉ ghi nhận lệnh chi tiền (Disbursement Order) nhưng chưa kết nối với API ngân hàng (Banking API) để thực hiện lệnh chuyển khoản tự động (Payout) đến tài khoản khách hàng, vẫn cần kế toán thực hiện thủ công trên Internet Banking.

## 6. Hướng phát triển (Future Development)

Dựa trên kết quả hiện tại và các hạn chế đã phân tích, đồ án đề xuất các hướng phát triển nâng cao trong tương lai:

1.  **Tích hợp Hệ sinh thái Thanh toán số (Digital Payment Ecosystem):**
    *   Kết nối trực tiếp với các cổng thanh toán (VNPay, MoMo) để hỗ trợ thanh toán qua QR Code động.
    *   Tích hợp Webhook ngân hàng (VietQR/Sepay) để tự động gạch nợ ngay khi khách hàng chuyển khoản thành công.

2.  **Chuyển đổi số Quy trình Giấy tờ (Digitalization):**
    *   Hoàn thiện module `Contract` để tự động sinh hợp đồng cầm cố (PDF).
    *   Tích hợp **Chữ ký số (Digital Signature)** hoặc OTP SMS để xác nhận hợp đồng điện tử, giảm thiểu in ấn và lưu trữ giấy tờ vật lý.

3.  **Xây dựng Ứng dụng Di động (Mobile Application):**
    *   **Customer App:** Cho phép khách hàng tự tra cứu khoản vay, xem lịch sử trả nợ, nhận thông báo nhắc nợ và thực hiện thanh toán online.
    *   **Staff App:** Trang bị tính năng quét mã QR/Barcode để nhân viên kho thực hiện kiểm kê tài sản nhanh chóng và chính xác.

4.  **Tích hợp eKYC & OCR:**
    *   Sử dụng công nghệ OCR để tự động trích xuất thông tin từ ảnh chụp Căn cước công dân (CCCD/CMND), giúp rút ngắn thời gian tạo hồ sơ khách hàng.
    *   Xác thực khuôn mặt (Face Matching) để tăng cường bảo mật và chống gian lận hồ sơ.

5.  **Nâng cấp AI Định giá (AI Enhancement):**
    *   Không chỉ dựa vào API bên ngoài (Gemini), hệ thống sẽ tích hợp Machine Learning để học từ lịch sử thanh lý tài sản thực tế của cửa hàng, từ đó đưa ra gợi ý giá sát với thị trường địa phương hơn.

6.  **Mở rộng Kiến trúc Hệ thống (System Architecture):**
    *   Chuyển đổi sang kiến trúc Microservices khi quy mô mở rộng nhiều chi nhánh.
    *   Sử dụng Caching (Redis) cho các báo cáo thống kê để cải thiện hiệu năng xử lý dữ liệu lớn.

---
**Tổng kết:** Dự án đã hoàn thành khoảng **80-85%** khối lượng công việc Backend, tập trung rất tốt vào nghiệp vụ lõi (Vay, Định giá, Báo cáo). Các phần còn thiếu chủ yếu liên quan đến tích hợp mở rộng (In ấn hợp đồng, Cổng thanh toán tự động).
