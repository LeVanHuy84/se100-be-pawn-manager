# Biểu đồ Hoạt động cho các chức năng Báo cáo (Report Activity Diagrams)

Tài liệu này chi tiết hóa quy trình từ đầu đến cuối (End-to-End) cho các hoạt động báo cáo trong hệ thống.

---

## 1. Quy trình Xem Báo cáo Doanh thu (Revenue Report)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý)|
start
:Truy cập trang Báo cáo Doanh thu;
:Chọn khoảng thời gian (Từ ngày - Đến ngày);
:Chọn Chi nhánh (tùy chọn);
:Nhấn nút "Xem báo cáo";

|Frontend|
:Gửi yêu cầu GET /v1/reports/revenue\nkèm tham số query;

|Backend (API)|
:Xác thực người dùng (Auth Guard);
:Kiểm tra quyền hạn (Role: MANAGER);
if (Hợp lệ?) then (Có)
  :Gửi query đến ReportsService;

  |Database (Prisma)|
  :Truy vấn RevenueLedger (Các khoản thu);
  :Truy vấn Disbursement (Các khoản chi);

  |Backend (Service)|
  :Khởi tạo danh sách ngày trong khoảng đã chọn;
  while (Còn ngày trong danh sách?) is (Đúng)
    :Tính tổng doanh thu theo từng loại (Lãi, phí, thanh lý);
    :Tính tổng chi (Giải ngân);
    :Tính toán số dư ròng;
  endwhile
  :Tổng hợp Summary (Chốt tổng các loại phí);
  :Trả về kết quả (JSON);
else (Không)
  :Trả về lỗi 403 Forbidden;
  stop
endif

|Frontend|
:Nhận dữ liệu báo cáo;
:Render biểu đồ đường/cột (Chart);
:Hiển thị bảng tổng kết doanh số;
stop
@enduml
```

### Giải thích quy trình

1. **Khởi tạo:** Người quản lý chọn phạm vi thời gian và chi nhánh muốn xem.
2. **Giao tiếp:** Frontend gọi API backend. Backend thực hiện xác thực xem có phải là Quản lý hay không (nhân viên không được xem doanh thu).
3. **Xử lý dữ liệu:**
   - Hệ thống thực hiện truy vấn đồng thời vào bảng `RevenueLedger` (ghi nhận lãi, phí dịch vụ, phí trễ hạn) và bảng `Disbursement` (ghi nhận tiền giải ngân ra).
   - Sau đó, logic tại Service sẽ "quét" qua từng ngày trong khoảng thời gian để phân loại và cộng dồn tiền.
4. **Kết quả:** Dữ liệu trả về được Frontend trực quan hóa bằng các biểu đồ giúp quản lý dễ dàng so sánh giữa doanh thu và chi phí giải ngân.

---

## 2. Quy trình Xem Sổ quản lý hàng ngày (Daily Log)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý/Nhân viên)|
start
:Truy cập mục "Sổ quản lý hàng ngày";
:Chọn ngày cần xem;

|Frontend|
:Gửi yêu cầu GET /v1/reports/daily-log\n?date=...;

|Backend (API)|
:Xác thực người dùng;
:Gửi yêu cầu xử lý đến ReportsService;

|Database (Prisma)|
:Tìm các Loan được tạo trong ngày (New Loans);
:Tìm các Loan có trạng thái CLOSED\ncập nhật trong ngày (Closed Loans);

|Backend (Service)|
:Với mỗi hợp đồng tìm được:;
:Lấy thông tin khách hàng (Tên, CMND, Địa chỉ);
:Lấy thông tin tài sản (Mô tả chi tiết);
:Định dạng dữ liệu theo mẫu sổ công an;
:Trả về dữ liệu thành công;

|Frontend|
:Hiển thị danh sách Hợp đồng mới;
:Hiển thị danh sách Hợp đồng tất toán;
:Cung cấp tùy chọn "In Sổ" (Print);
stop
@enduml
```

### Giải thích quy trình

1. **Mục đích:** Cung cấp dữ liệu để cơ sở kinh doanh ghi chép vào sổ quản lý do công an cấp.
2. **Truy vấn:** Backend tập trung vào hai nhóm dữ liệu chính trong ngày được chọn:
   - **Hợp đồng mới:** Những hợp đồng bắt đầu giải ngân.
   - **Hợp đồng đã đóng:** Những hợp đồng khách đã chuộc đồ hoặc đã hoàn tất nghĩa vụ.
3. **Chi tiết khách hàng:** Khác với báo cáo doanh thu, quy trình này yêu cầu lấy thông tin định danh cá nhân (PII) như CMND/CCCD và địa chỉ để phục vụ mục đích khai báo lưu trú/kinh doanh đặc thù.

---

## 3. Quy trình Xem Báo cáo Quý (Mẫu ĐK13)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý)|
start
:Chọn Năm và Quý (1, 2, 3, 4);
:Nhấn "Tạo báo cáo ĐK13";

|Frontend|
:Gửi yêu cầu GET /v1/reports/quarterly\n?year=...&quarter=...;

|Backend (API)|
:Kiểm tra quyền MANAGER;

|Backend (Service)|
:Tính toán ngày bắt đầu và ngày kết thúc quý;
fork
  |Database|
  :Thống kê số lượng khoản vay (Mới, Đang vay, Quá hạn);
fork again
  |Database|
  :Thống kê tài sản theo loại (Nhập, Xuất, Tồn kho);
fork again
  |Database|
  :Tính tổng doanh thu theo phân loại phí;
fork again
  |Clerk API|
  :Lấy danh sách nhân viên của cửa hàng;
end fork

|Backend (Service)|
:Tính toán các chỉ số tuân thủ (Average LTV, Interest Rate);
:Định dạng theo chuẩn mẫu ĐK13;
:Trả về kết quả;

|Frontend|
:Hiển thị báo cáo tổng hợp;
:Cho phép Xuất file (nếu có);
stop
@enduml
```

### Giải thích quy trình

1. **Tính chất:** Đây là quy trình báo cáo phức tạp nhất, tổng hợp dữ liệu từ nhiều nguồn.
2. **Xử lý song song:** Để tối ưu tốc độ, Backend thực hiện nhiều truy vấn cùng lúc (fork):
   - Đếm số lượng hợp đồng vay theo trạng thái.
   - Tổng hợp tài sản thế chấp theo từng nhóm (Điện thoại, Xe máy, Trang sức...).
   - Tính toán doanh thu thô.
   - Gọi API bên thứ 3 (Clerk) để lấy số lượng nhân sự.
3. **Phân tích:** Service tính toán thêm các chỉ số như tỷ lệ cho vay trên giá trị tài sản (LTV) trung bình và lãi suất bình quân để đảm bảo cửa hàng hoạt động trong khung quy định của pháp luật.
4. **Đầu ra:** Frontend trình bày dữ liệu này theo đúng định dạng mẫu biểu của cơ quan chức năng (ĐK13).
