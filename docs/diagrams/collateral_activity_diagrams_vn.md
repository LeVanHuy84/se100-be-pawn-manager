# Sơ đồ Hoạt động - Quản lý Tài sản Cầm cố (Collateral Asset Activity Diagrams)

Tài liệu này mô tả chi tiết luồng hoạt động (Activity Flow) từ End-to-End cho các chức năng quản lý tài sản cầm cố.

## 1. Xem danh sách tài sản (View List)

```plantuml
@startuml
title Xem danh sách tài sản (View Collateral List)
|Người dùng (Frontend)|
start
:Truy cập trang danh sách tài sản;
:Chọn bộ lọc (nếu có)
(Loại tài sản, Trạng thái, Kho);
:Gửi yêu cầu lấy danh sách
(GET /collateral-assets);

|Backend API|
:Xác thực người dùng (Auth Guard);
if (Hợp lệ?) then (Yes) 
    :Controller nhận request;
    :Service xây dựng câu truy vấn
    (Query Builder);
    
    |Database|
    :Thực hiện truy vấn (Select with Pagination);
    :Trả về danh sách bản ghi;
    
    |Backend API|
    :Format dữ liệu trả về (DTO);
    :Trả về Response (200 OK);
else (No) 
    :Trả về lỗi 401/403;
endif

|Người dùng (Frontend)|
:Hiển thị danh sách tài sản;
stop
@enduml
```

### Giải thích quy trình
1.  **Người dùng** truy cập vào giao diện quản lý tài sản trên Frontend và có thể áp dụng các bộ lọc tìm kiếm.
2.  **Frontend** gửi request API `GET` tới Backend.
3.  **Backend** kiểm tra quyền truy cập (Token hợp lệ, Role Staff/Manager).
4.  **Service** xử lý logic tìm kiếm và truy vấn **Database**.
5.  **Database** trả về kết quả.
6.  **Backend** phản hồi dữ liệu JSON chuẩn hóa cho Frontend để hiển thị.

---

## 2. Xem chi tiết tài sản (View Detail)

```plantuml
@startuml
title Xem chi tiết tài sản (View Collateral Detail)
|Người dùng (Frontend)|
start
:Click vào một tài sản trong danh sách;
:Gửi yêu cầu lấy chi tiết
(GET /collateral-assets/:id);

|Backend API|
:Xác thực người dùng;
:Service tìm tài sản theo ID;

|Database|
:Query tìm bản ghi theo ID;
if (Tồn tại?) then (Yes) 
    :Trả về dữ liệu chi tiết;
    
    |Backend API|
    :Trả về Response (200 OK);
    
    |Người dùng (Frontend)|
    :Hiển thị thông tin chi tiết
    (Thông tin chung, Ảnh, Định giá);
else (No) 
    |Backend API|
    :Ném lỗi NotFoundException;
    :Trả về lỗi 404;
    
    |Người dùng (Frontend)|
    :Hiển thị thông báo lỗi;
endif
stop
@enduml
```

### Giải thích quy trình
1.  **Người dùng** chọn một tài sản cụ thể để xem.
2.  **Backend** nhận ID từ URL, truy vấn **Database**.
3.  Nếu tài sản tồn tại, trả về đầy đủ thông tin (bao gồm cả lịch sử định giá, hình ảnh).
4.  Nếu không tìm thấy, hệ thống báo lỗi 404.

---

## 3. Tạo tài sản cầm cố mới (Create Collateral)

```plantuml
@startuml
title Tạo tài sản cầm cố mới (Create Collateral)
|Người dùng (Frontend)|
start
:Nhập thông tin tài sản
(Tên, Loại, Chủ sở hữu, Định giá);
:Upload hình ảnh minh chứng;
:Nhấn nút "Tạo mới";
:Gửi request Multipart
(POST /collateral-assets);

|Backend API|
:Xác thực quyền hạn (Staff/Manager);
:Validate dữ liệu đầu vào (DTO);
if (Dữ liệu hợp lệ?) then (Yes) 
    :Upload ảnh lên Cloudinary (hoặc Storage);
    :Chuẩn bị dữ liệu lưu DB;
    
    |Database|
    :Insert bản ghi Collateral mới;
    :Trả về bản ghi vừa tạo;
    
    |Backend API|
    :Trả về Response (201 Created);
    
    |Người dùng (Frontend)|
    :Hiển thị thông báo thành công;
    :Chuyển hướng hoặc cập nhật danh sách;
else (No) 
    |Backend API|
    :Trả về lỗi 400 Bad Request;
    
    |Người dùng (Frontend)|
    :Hiển thị lỗi validation form;
endif
stop
@enduml
```

### Giải thích quy trình
1.  **Người dùng** điền form tạo mới, bao gồm việc tải lên các hình ảnh thực tế của tài sản.
2.  **Backend** nhận dữ liệu dưới dạng `multipart/form-data`.
3.  Hệ thống xử lý upload ảnh (lưu vào Cloud storage hoặc Server disk) để lấy URL.
4.  Sau khi có URL ảnh và dữ liệu hợp lệ, **Backend** lưu thông tin tài sản vào **Database** với trạng thái mặc định (thường là `PROPOSED` hoặc `STORED`).
5.  Thông báo thành công được gửi về Frontend.

---

## 4. Cập nhật thông tin tài sản (Update Info)

```plantuml
@startuml
title Cập nhật thông tin tài sản (Update Collateral)
|Người dùng (Frontend)|
start
:Mở form chỉnh sửa tài sản;
:Thay đổi thông tin hoặc upload ảnh mới;
:Nhấn "Lưu thay đổi";
:Gửi request
(PATCH /collateral-assets/:id);

|Backend API|
:Xác thực quyền hạn;
:Kiểm tra sự tồn tại của tài sản;
if (Tồn tại?) then (Yes) 
    :Xử lý ảnh mới (nếu có);
    :Cập nhật các trường thông tin thay đổi;
    
    |Database|
    :Update bản ghi Collateral;
    
    |Backend API|
    :Trả về dữ liệu đã cập nhật (200 OK);
    
    |Người dùng (Frontend)|
    :Cập nhật giao diện;
else (No) 
    :Trả về lỗi 404;
endif
stop
@enduml
```

### Giải thích quy trình
1.  Cho phép chỉnh sửa thông tin tài sản (trừ các trường cấm sửa đổi tùy nghiệp vụ).
2.  Tương tự như quy trình tạo mới, nhưng sử dụng phương thức `PATCH` để chỉ cập nhật các trường thay đổi.

---

## 5. Cập nhật vị trí lưu kho (Update Location)

```plantuml
@startuml
title Cập nhật vị trí lưu kho (Update Storage Location)
|Người dùng (Frontend)|
start
:Chọn tài sản cần chuyển kho;
:Chọn vị trí/kho mới (Storage Location);
:Gửi request
(PUT /collaterals/:id/location);

|Backend API|
:Xác thực quyền hạn;
:Kiểm tra tài sản có đang ở trạng thái cho phép chuyển kho?;
note right
Chỉ cho phép khi tài sản đang 
STORED hoặc PROPOSED
end note

if (Hợp lệ?) then (Yes) 
    |Database|
    :Update trường storageLocation;
    
    |Backend API|
    :Trả về thành công;
    
    |Người dùng (Frontend)|
    :Hiển thị vị trí mới;
else (No) 
    :Trả về lỗi 400 (Trạng thái không hợp lệ);
endif
stop
@enduml
```

### Giải thích quy trình
1.  Chức năng này dùng để quản lý kho bãi, cập nhật xem tài sản đang nằm ở kệ/kho nào.
2.  **Backend** cần kiểm tra trạng thái tài sản (ví dụ: Tài sản đã thanh lý hoặc đã trả khách thì không thể cập nhật vị trí kho).

---

## 6. Tạo hồ sơ thanh lý (Create Liquidation)

```plantuml
@startuml
title Tạo hồ sơ thanh lý (Create Liquidation)
|Người dùng (Frontend)|
start
:Chọn tài sản (thường là quá hạn);
:Nhấn "Yêu cầu thanh lý";
:Gửi request
(POST /liquidations);

|Backend API|
:Xác thực quyền hạn;
:Kiểm tra điều kiện thanh lý;
note right
Ví dụ: Khoản vay liên quan đã 
quá hạn (Overdue) quá số ngày quy định
end note

if (Đủ điều kiện?) then (Yes) 
    :Chuyển trạng thái tài sản -> LIQUIDATING;
    
    |Database|
    :Update Collateral Status;
    :Tạo bản ghi Audit/Log (Optional);
    
    |Backend API|
    :Trả về thông tin hồ sơ thanh lý;
    
    |Người dùng (Frontend)|
    :Hiển thị trạng thái "Đang thanh lý";
else (No) 
    :Trả về lỗi 400 (Chưa đủ điều kiện);
endif
stop
@enduml
```

### Giải thích quy trình
1.  Nhân viên hoặc Quản lý đánh dấu một tài sản cần được thanh lý (do khách không trả nợ đúng hạn).
2.  Hệ thống kiểm tra các quy tắc nghiệp vụ (Business Rules) trước khi cho phép chuyển trạng thái sang `LIQUIDATING`.

---

## 7. Bán tài sản (Sell Collateral - Manager Only)

```plantuml
@startuml
title Bán tài sản (Sell Collateral)
|Quản lý (Frontend)|
start
:Chọn tài sản đang thanh lý;
:Nhập thông tin bán (Giá bán, Người mua);
:Nhấn "Xác nhận bán";
:Gửi request
(POST /liquidations/:id/sell);

|Backend API|
:Xác thực quyền Admin/Manager;
if (Có quyền?) then (Yes) 
    :Kiểm tra trạng thái tài sản (Phải là LIQUIDATING);
    if (Hợp lệ?) then (Yes) 
        :Tính toán doanh thu (Revenue);
        :Cập nhật trạng thái -> SOLD;
        
        |Database|
        :Update Collateral;
        :Insert RevenueLedger (Ghi nhận doanh thu);
        
        |Backend API|
        :Trả về kết quả thành công;
        
        |Quản lý (Frontend)|
        :Thông báo bán thành công;
        :Cập nhật danh sách doanh thu;
    else (No) 
        :Trả về lỗi 400 (Sai trạng thái);
    endif
else (No) 
    :Trả về lỗi 403 Forbidden;
endif
stop
@enduml
```

### Giải thích quy trình
1.  Đây là bước cuối cùng của quy trình thanh lý.
2.  **Chỉ Manager** mới có quyền thực hiện hành động này.
3.  **Backend** sẽ thực hiện nhiều tác vụ: cập nhật trạng thái tài sản thành `SOLD`, ghi nhận doanh thu vào bảng `RevenueLedger` để phục vụ báo cáo tài chính.

```