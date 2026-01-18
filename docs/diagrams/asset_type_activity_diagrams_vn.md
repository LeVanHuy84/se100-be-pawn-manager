# Biểu đồ Hoạt động - Quản lý Loại tài sản (Asset Type Activity Diagrams)

Tài liệu này chi tiết các luồng xử lý từ đầu đến cuối (End-to-End) cho các thao tác CRUD đối với Loại tài sản.

---

## 1. Xem danh sách loại tài sản

```plantuml
@startuml
|Người dùng|
start
:Truy cập trang "Quản lý Loại tài sản";

|Frontend|
:Gửi yêu cầu GET /asset-types;

|Backend (API)|
:Kiểm tra quyền truy cập (JWT);
if (Hợp lệ?) then (có)
  :Gọi AssetTypeService.findAll();
  |Database|
  :Truy vấn toàn bộ bản ghi trong bảng AssetType;
  :Trả về kết quả truy vấn;
  |Backend (API)|
  :Ánh xạ dữ liệu sang DTO;
  :Trả về HTTP 200 kèm danh sách;
else (không)
  :Trả về HTTP 401/403;
endif

|Frontend|
if (Thành công?) then (có)
  :Hiển thị danh sách lên bảng dữ liệu;
else (không)
  :Hiển thị thông báo lỗi;
endif
stop
@enduml
```

**Giải thích luồng:**

1. Người dùng mở menu quản lý loại tài sản trên giao diện.
2. Frontend gửi yêu cầu lấy danh sách đến Backend.
3. Backend xác thực người dùng và truy vấn cơ sở dữ liệu.
4. Dữ liệu được trả về, Backend chuyển đổi sang định dạng phù hợp (DTO) và gửi lại cho Frontend.
5. Frontend hiển thị danh sách cho người dùng.

---

## 2. Tìm kiếm loại tài sản

```plantuml
@startuml
|Người dùng|
start
:Nhập từ khóa tìm kiếm (Tên/Mã);

|Frontend|
:Gửi yêu cầu GET /asset-types?search=keyword;

|Backend (API)|
:Xác thực người dùng;
:Xây dựng truy vấn tìm kiếm (SQL LIKE hoặc Full-text search);

|Database|
:Thực hiện tìm kiếm theo điều kiện;
:Trả về kết quả;

|Backend (API)|
:Trả về danh sách kết quả (HTTP 200);

|Frontend|
:Cập nhật lại bảng hiển thị với kết quả mới;
stop
@enduml
```

**Giải thích luồng:**

1. Người dùng nhập thông tin vào ô tìm kiếm.
2. Hệ thống thực hiện tìm kiếm lọc ngay lập tức hoặc khi nhấn Enter.
3. Backend xử lý câu lệnh truy vấn có điều kiện lọc và trả về kết quả tương ứng.

---

## 3. Thêm loại tài sản mới

```plantuml
@startuml
|Người dùng|
start
:Nhấn nút "Thêm mới";
:Nhập tên, mô tả và các thuộc tính;
:Nhấn "Lưu";

|Frontend|
:Kiểm tra dữ liệu đầu vào cơ bản;
if (Dữ liệu hợp lệ?) then (có)
  :Gửi yêu cầu POST /asset-types;
else (không)
  :Hiển thị lỗi nhập liệu;
  stop
endif

|Backend (API)|
:Xác thực người dùng (Quyền Admin);
:Kiểm tra dữ liệu (DTO Validation);
:Kiểm tra Tên loại tài sản đã tồn tại chưa?;
if (Hợp lệ & Chưa tồn tại?) then (có)
  |Database|
  :Lưu bản ghi bản ghi mới vào DB;
  :Trả về kết quả thành công;
  |Backend (API)|
  :Ghi log hoạt động;
  :Trả về HTTP 201 (Created);
else (không)
  |Backend (API)|
  :Trả về lỗi (HTTP 400/409);
endif

|Frontend|
if (Thành công?) then (có)
  :Hiển thị thông báo thành công;
  :Tải lại danh sách;
else (không)
  :Hiển thị thông báo lỗi từ server;
endif
stop
@enduml
```

**Giải thích luồng:**

1. Người dùng điền form và nhấn lưu.
2. Backend kiểm tra tính nghiệp vụ (ví dụ: không cho phép trùng tên loại tài sản).
3. Sau khi lưu vào DB thành công, hệ thống ghi log và phản hồi cho người dùng.

---

## 4. Cập nhật thông tin loại tài sản

```plantuml
@startuml
|Người dùng|
start
:Chọn một loại tài sản và nhấn "Chỉnh sửa";
:Thay đổi thông tin cần thiết;
:Nhấn "Cập nhật";

|Frontend|
:Gửi yêu cầu PATCH/PUT /asset-types/{id};

|Backend (API)|
:Xác thực người dùng;
:Kiểm tra ID có tồn tại không?;
:Kiểm tra dữ liệu hợp lệ;
if (Hợp lệ?) then (có)
  |Database|
  :Cập nhật bản ghi trong cơ sở dữ liệu;
  :Xác nhận cập nhật thành công;
  |Backend (API)|
  :Trả về HTTP 200;
else (không)
  |Backend (API)|
  :Trả về HTTP 400;
endif

|Frontend|
:Hiển thị thông báo và cập nhật UI;
stop
@enduml
```

**Giải thích luồng:**

1. Tương tự như thêm mới, nhưng Backend cần kiểm tra sự tồn tại của ID trước khi cập nhật.
2. Chỉ những trường thay đổi mới được cập nhật (nếu dùng PATCH).

---

## 5. Xóa loại tài sản

```plantuml
@startuml
|Người dùng|
start
:Nhấn nút "Xóa" trên một dòng dữ liệu;

|Frontend|
:Hiển thị hộp thoại xác nhận;
if (Người dùng đồng ý?) then (có)
  :Gửi yêu cầu DELETE /asset-types/{id};
else (không)
  stop
endif

|Backend (API)|
:Xác thực người dùng;
:Kiểm tra loại tài sản có đang được sử dụng không?;
if (Đang được sử dụng trong Hợp đồng?) then (có)
  :Trả về lỗi (HTTP 400 - Đang liên kết);
  |Frontend|
  :Hiển thị thông báo lỗi "Dữ liệu đang được sử dụng";
  stop
else (không)
  |Database|
  :Xóa bản ghi (hoặc Xóa mềm - isDeleted = true);
  :Xác nhận xóa thành công;
  |Backend (API)|
  :Trả về HTTP 200/204;
endif

|Frontend|
:Thông báo thành công và xóa dòng khỏi bảng;
stop
@enduml
```

**Giải thích luồng:**

1. Thao tác xóa thường yêu cầu xác nhận từ người dùng.
2. **Quan trọng:** Backend cần kiểm tra ràng buộc dữ liệu. Nếu loại tài sản này đang được dùng cho các tài sản thế chấp trong hệ thống, thường sẽ không cho phép xóa để đảm bảo toàn vẹn dữ liệu.
