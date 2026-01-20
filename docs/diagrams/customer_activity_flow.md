# Biểu đồ Hoạt động (Activity Diagrams) - Quản lý Khách hàng

Tài liệu này mô tả chi tiết quy trình nghiệp vụ từ đầu đến cuối (End-to-End) cho các hoạt động quản lý khách hàng.

---

## 1. Xem danh sách khách hàng (List Customers)

```plantuml
@startuml
|Frontend|
start
:Người dùng truy cập trang danh sách;
:Gửi yêu cầu GET /customers (kèm pagination);

|Backend (Controller)|
:Tiếp nhận yêu cầu;
:Kiểm tra quyền hạn (Role: Staff/Manager);

|Backend (Service)|
:Tính toán skip/limit từ query;
:Truy vấn Prisma findMany & count;

|Database|
:Trả về danh sách & tổng số bản ghi;

|Backend (Mapper)|
:Chuyển đổi dữ liệu sang CustomerResponse;

|Frontend|
:Hiển thị bảng danh sách khách hàng;
stop
@enduml
```

**Giải thích luồng:**

1. **Frontend:** Người dùng mở trang quản lý khách hàng, hệ thống tự động gửi yêu cầu lấy dữ liệu kèm theo tham số phân trang (ví dụ: trang 1, 20 bản ghi).
2. **Backend (Controller):** Kiểm tra xem người dùng có quyền Nhân viên hoặc Quản lý hay không.
3. **Backend (Service):** Xử lý logic phân trang và gọi database thông qua Prisma.
4. **Database:** Thực hiện truy vấn và trả về dữ liệu thô.
5. **Backend (Mapper):** Định dạng lại dữ liệu để ẩn các thông tin nhạy cảm hoặc không cần thiết trước khi gửi về Client.
6. **Frontend:** Nhận dữ liệu và hiển thị lên giao diện bảng.

---

## 2. Tìm kiếm khách hàng (Search Customers)

```plantuml
@startuml
|Frontend|
start
:Người dùng nhập từ khóa (Tên/SĐT/CMND/Email);
:Gửi yêu cầu GET /customers?search=keyword;

|Backend (Service)|
:Xây dựng điều kiện WHERE (OR logic);
:Truy vấn Prisma với điều kiện 'contains' (Insensitive);

|Database|
:Tìm kiếm và trả về kết quả khớp;

|Frontend|
:Hiển thị kết quả tìm kiếm lên màn hình;
stop
@enduml
```

**Giải thích luồng:**

1. **Frontend:** Người dùng nhập từ khóa vào ô tìm kiếm. Yêu cầu được gửi lên kèm theo parameter `search`.
2. **Backend:** Hệ thống xây dựng câu truy vấn tìm kiếm không phân biệt hoa thường (`insensitive`) trên nhiều trường: Họ tên, Số điện thoại, CCCD và Email.
3. **Database:** Trả về các bản ghi thỏa mãn điều kiện.

---

## 3. Xem chi tiết khách hàng (View Details)

```plantuml
@startuml
|Frontend|
start
:Người dùng chọn một khách hàng;
:Gửi yêu cầu GET /customers/:id;

|Backend (Service)|
:Truy vấn Prisma findUnique;
if (Khách hàng tồn tại?) then (có)
    :Lấy thông tin kèm theo các Khoản vay (Loans);
    :Trả về chi tiết khách hàng;
else (không)
    :Ném lỗi NotFoundException (404);
endif

|Frontend|
if (Lỗi 404?) then (có)
    :Hiển thị thông báo "Không tìm thấy";
else (không)
    :Hiển thị trang chi tiết (Thông tin cá nhân, liên hệ, lịch sử vay);
endif
stop
@enduml
```

**Giải thích luồng:**

1. **Frontend:** Khi người dùng nhấn vào một dòng khách hàng, ID của khách hàng đó được gửi lên Backend.
2. **Backend:** Thực hiện tìm kiếm khách hàng theo ID duy nhất, đồng thời nạp thêm thông tin về địa chỉ (Ward/District/Province) và lịch sử các khoản vay. Nếu không tìm thấy, hệ thống sẽ trả về lỗi 404.
3. **Frontend:** Hiển thị toàn bộ thông tin chi tiết hoặc thông báo lỗi nếu có.

---

## 4. Thêm mới khách hàng (Create Customer)

```plantuml
@startuml
|Frontend|
start
:Điền form (Họ tên, CCCD, Địa chỉ...);
:Tải lên ảnh CCCD (Mặt trước & Mặt sau);
:Gửi Multipart request (Data + Files);

|Backend (Service)|
:Kiểm tra ảnh bắt buộc;
:Kiểm tra trùng lặp CCCD/SĐT trong DB;
if (Dữ liệu hợp lệ?) then (có)
    :Tải ảnh lên Cloudinary;
    :Cloudinary trả về URL ảnh;
    :Lưu thông tin khách hàng & URL ảnh vào DB;
    :Trả về thông báo thành công;
else (không)
    :Trả về lỗi (Conflict/BadRequest);
endif

|Frontend|
:Thông báo "Thêm thành công" và quay lại danh sách;
stop
@enduml
```

**Giải thích luồng:**

1. **Frontend:** Người dùng điền đầy đủ thông tin và chọn file ảnh. Dữ liệu được gửi dưới dạng `form-data`.
2. **Backend:**
   - Kiểm tra xem file ảnh có được gửi kèm không.
   - Kiểm tra xem số CCCD hoặc SĐT đã tồn tại trong hệ thống chưa (tránh trùng lặp).
   - Tải ảnh lên dịch vụ lưu trữ đám mây Cloudinary.
   - Lưu toàn bộ thông tin (bao gồm URL ảnh từ Cloudinary) vào Database.
3. **Frontend:** Hiển thị thông báo kết quả cho người dùng.

---

## 5. Cập nhật thông tin khách hàng (Update Customer)

```plantuml
@startuml
|Frontend|
start
:Chỉnh sửa thông tin tại trang chi tiết;
:Gửi yêu cầu PATCH /customers/:id;

|Backend (Service)|
:Kiểm tra khách hàng có tồn tại?;
:Kiểm tra trùng lặp CCCD/SĐT (loại trừ ID hiện tại);
if (Có cập nhật ảnh?) then (có)
    :Tải ảnh mới lên Cloudinary;
    :Cập nhật URL ảnh mới vào JSON;
endif
:Thực hiện Prisma update;

|Database|
:Cập nhật bản ghi;

|Frontend|
:Cập nhật giao diện với dữ liệu mới;
stop
@enduml
```

**Giải thích luồng:**

1. **Frontend:** Người dùng thay đổi thông tin trên giao diện. Các trường không đổi sẽ không được gửi lên hoặc gửi giữ nguyên.
2. **Backend:**
   - Xác minh khách hàng cần sửa có tồn tại không.
   - Kiểm tra xem thông tin mới (nếu có đổi CCCD/SĐT) có bị trùng với người khác không.
   - Nếu người dùng tải ảnh mới, hệ thống sẽ ghi đè ảnh cũ trên Cloudinary và cập nhật lại URL.
3. **Frontend:** Nhận phản hồi thành công và cập nhật lại màn hình.

---

## 6. Xóa khách hàng (Delete Customer)

```plantuml
@startuml
|Frontend|
start
:Nhấn nút Xóa tại Dashboard;
:Xác nhận hộp thoại "Bạn có chắc chắn?";
:Gửi yêu cầu DELETE /customers/:id;

|Backend (Controller)|
:Kiểm tra quyền Quản lý (Manager);

|Backend (Service)|
:Kiểm tra ràng buộc dữ liệu;
if (Khách hàng có khoản vay đang hoạt động?) then (có)
    :Từ chối xóa, báo lỗi ràng buộc;
else (không)
    :Thực hiện Prisma delete;
    :Trả về thành công;
endif

|Frontend|
:Xóa dòng tương ứng khỏi bảng dữ liệu;
stop
@enduml
```

**Giải thích luồng:**

1. **Frontend:** Chỉ người dùng có quyền Quản lý mới thấy nút xóa. Sau khi xác nhận, yêu cầu xóa được gửi đi.
2. **Backend:**
   - Chỉ cho phép `Role.MANAGER` thực hiện.
   - **Quan trọng:** Kiểm tra khách hàng đó có đang nợ hoặc có hợp đồng nào đang chạy không. Nếu có, tuyệt đối không cho phép xóa để giữ toàn vẹn dữ liệu tài chính.
   - Nếu đủ điều kiện, thực hiện xóa bản ghi khỏi Database.
3. **Frontend:** Cập nhật lại danh sách, ẩn khách hàng vừa xóa.
