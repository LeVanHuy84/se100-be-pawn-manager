# Biểu đồ Hoạt động cho Quản lý Cửa hàng (Store Activity Diagrams)

Tài liệu này chi tiết hóa quy trình từ đầu đến cuối (End-to-End) cho các hoạt động quản lý **Cửa hàng (Store)** trong hệ thống, bao gồm các tương tác từ người dùng, giao diện (Frontend) đến máy chủ (Backend) và cơ sở dữ liệu (Database).

---

## 1. Quy trình Xem danh sách cửa hàng (View Store List)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý)|
start
:Truy cập trang Quản lý Cửa hàng;
:Nhập tiêu chí tìm kiếm/lọc (tên, mã, trạng thái);

|Frontend|
:Gửi yêu cầu GET /v1/stores\nkèm tham số query;

|Backend (API)|
:Xác thực người dùng (Auth Guard);
:Kiểm tra quyền hạn (Role: MANAGER);
if (Hợp lệ?) then (Có)
  :Gửi query đến StoreService;

  |Database (Prisma)|
  :Truy vấn bảng Store với các điều kiện lọc;
  :Đếm tổng số bản ghi;

  |Backend (Service)|
  :Áp dụng phân trang (Pagination);
  :Trả về danh sách cửa hàng và thông tin phân trang;
else (Không)
  :Trả về lỗi 403 Forbidden;
  stop
endif

|Frontend|
:Nhận dữ liệu danh sách cửa hàng;
:Hiển thị danh sách lên bảng (Table);
stop
@enduml
```

### Giải thích quy trình

1. **Khởi tạo:** Người quản lý truy cập vào mục cấu hình hệ thống hoặc quản lý chi nhánh.
2. **Giao tiếp:** Frontend gọi API backend với các tham số như từ khóa tìm kiếm hoặc trang hiện tại. Backend kiểm tra xem người dùng có phải là Quản lý hay không.
3. **Truy vấn:** Hệ thống tìm kiếm trong bảng `Store` dựa trên các điều kiện lọc. Kết quả được phân trang để đảm bảo hiệu năng khi số lượng cửa hàng lớn.
4. **Kết quả:** Danh sách các cửa hàng (bao gồm tên, địa chỉ, mã cửa hàng) được hiển thị cho người dùng.

---

## 2. Quy trình Thêm mới cửa hàng (Create Store)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý)|
start
:Nhấn nút "Thêm cửa hàng";
:Nhập thông tin (Tên, Mã, Địa chỉ, Số điện thoại...);
:Nhấn "Lưu";

|Frontend|
:Kiểm tra sơ bộ dữ liệu (Client-side validation);
if (Dữ liệu hợp lệ?) then (Có)
  :Gửi yêu cầu POST /v1/stores\nkèm dữ liệu cửa hàng;
else (Không)
  :Hiển thị lỗi nhập liệu;
  stop
endif

|Backend (API)|
:Xác thực và kiểm tra quyền MANAGER;
if (Hợp lệ?) then (Có)
  :Gửi dữ liệu đến StoreService;

  |Backend (Service)|
  :Kiểm tra Mã cửa hàng (code) đã tồn tại chưa;
  if (Đã tồn tại?) then (Có)
    :Trả về lỗi 400 Bad Request (Code already exists);
  else (Không)
    |Database (Prisma)|
    :Tạo bản ghi mới trong bảng Store;

    |Backend (Service)|
    :Trả về thông tin cửa hàng vừa tạo;
  endif
else (Không)
  :Trả về lỗi 403 Forbidden;
  stop
endif

|Frontend|
:Nhận phản hồi thành công;
:Hiển thị thông báo "Thêm thành công";
:Cập nhật lại danh sách cửa hàng;
stop
@enduml
```

### Giải thích quy trình

1. **Nhập liệu:** Người quản lý điền các thông tin bắt buộc của một chi nhánh mới.
2. **Kiểm tra:**
   - **Frontend:** Kiểm tra các trường không được để trống, định dạng số điện thoại.
   - **Backend:** Kiểm tra tính duy nhất của Mã cửa hàng (Code) để tránh trùng lặp trong hệ thống.
3. **Lưu trữ:** Sau khi vượt qua tất cả các lớp kiểm tra, một bản ghi mới được tạo trong cơ sở dữ liệu.
4. **Phản hồi:** Hệ thống thông báo kết quả và làm mới danh sách hiển thị để người dùng thấy ngay cửa hàng vừa thêm.

---

## 3. Quy trình Xem chi tiết cửa hàng (View Store Detail)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý)|
start
:Chọn một cửa hàng từ danh sách;

|Frontend|
:Lấy ID cửa hàng;
:Gửi yêu cầu GET /v1/stores/{id};

|Backend (API)|
:Xác thực và kiểm tra quyền MANAGER;

|Backend (Service)|
:Gửi yêu cầu tìm kiếm theo ID đến StoreService;

|Database (Prisma)|
:Truy vấn chi tiết cửa hàng;
:Lấy thông tin liên quan (Nhân viên, Tài sản tại kho - nếu cần);

|Backend (Service)|
:Tổng hợp dữ liệu;
:Trả về JSON chi tiết cửa hàng;

|Frontend|
:Hiển thị form thông tin chi tiết;
stop
@enduml
```

### Giải thích quy trình

1. **Khởi tạo:** Người dùng muốn xem thông tin kỹ hơn hoặc chuẩn bị chỉnh sửa một cửa hàng cụ thể.
2. **Truy vấn:** Backend tìm kiếm bản ghi trong database bằng khóa chính (ID).
3. **Kết quả:** Trả về toàn bộ thuộc tính của cửa hàng để điền vào form hiển thị ở Frontend.

---

## 4. Quy trình Cập nhật thông tin cửa hàng (Update Store)

### Biểu đồ Hoạt động

```plantuml
@startuml
|Người dùng (Quản lý)|
start
:Thay đổi thông tin trên form chi tiết;
:Nhấn "Cập nhật";

|Frontend|
:Gửi yêu cầu PATCH /v1/stores/{id}\nkèm các trường đã thay đổi;

|Backend (API)|
:Xác thực và kiểm tra quyền MANAGER;

|Backend (Service)|
:Kiểm tra sự tồn tại của ID;
if (Tìm thấy?) then (Có)
  |Database (Prisma)|
  :Cập nhật các trường thông tin mới;

  |Backend (Service)|
  :Trả về dữ liệu đã cập nhật;
else (Không)
  :Trả về lỗi 404 Not Found;
  stop
endif

|Frontend|
:Hiển thị thông báo "Cập nhật thành công";
:Làm mới dữ liệu trên giao diện;
stop
@enduml
```

### Giải thích quy trình

1. **Chỉnh sửa:** Người dùng sửa đổi các thông tin như địa chỉ hoặc số điện thoại liên lạc của chi nhánh.
2. **Giao tiếp:** Frontend chỉ gửi các trường dữ liệu bị thay đổi (Partial Update) thông qua phương thức PATCH.
3. **Thực thi:** Backend thực hiện câu lệnh `update` trong Prisma.
4. **Kết thúc:** Giao diện người dùng được cập nhật để phản ánh những thay đổi mới nhất.
