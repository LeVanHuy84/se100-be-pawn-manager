# Biểu đồ Hoạt động - Quản lý Khoản vay (Loan Activity Diagrams)

Tài liệu này mô tả chi tiết luồng hoạt động (Activity Flow) cho các chức năng quản lý khoản vay, từ thao tác người dùng (Frontend) đến xử lý hệ thống (Backend).

## 1. Tạo hồ sơ vay mới (Create Loan)

```plantuml
@startuml
|Người dùng (Frontend)|
start
:Nhập thông tin hồ sơ vay
(Khách hàng, Tài sản, Số tiền, Loại vay);
:Nhấn nút "Tạo hồ sơ";
|Hệ thống (Backend)|
:Nhận yêu cầu (CreateLoanDto);
:Kiểm tra Customer và Store tồn tại?;
if (Không tồn tại) then (Yes)
  :Trả về lỗi 404 Not Found;
  |Người dùng (Frontend)|
  :Hiển thị thông báo lỗi;
  stop
else (No)
endif
|Hệ thống (Backend)|
:Lấy thông tin Tài sản (Collaterals);
:Kiểm tra trạng thái Tài sản
(Phải là PROPOSED và chưa gắn LoanId)?;
if (Không hợp lệ) then (Yes)
  :Trả về lỗi 400 Bad Request;
  |Người dùng (Frontend)|
  :Hiển thị thông báo lỗi;
  stop
else (No)
endif
|Hệ thống (Backend)|
:Lấy tham số hệ thống
(Lãi suất phạt, Phí lưu kho);
:Chạy mô phỏng khoản vay
(Tính lịch trả nợ, lãi, phí);
:Bắt đầu Transaction;
fork
  :Tạo bản ghi Loan (PENDING);
fork again
  :Cập nhật Collaterals (Gán LoanId);
fork again
  :Lưu lịch trả nợ (RepaymentSchedule);
fork again
  :Ghi Audit Log (CREATE_LOAN);
end fork
:Commit Transaction;
:Trả về thông tin khoản vay;
|Người dùng (Frontend)|
:Hiển thị thông báo thành công;
:Chuyển đến trang chi tiết khoản vay;
stop
@enduml
```

**Giải thích luồng xử lý:**
1.  **Người dùng** nhập các thông tin cần thiết: chọn Khách hàng, chọn Tài sản (đang ở trạng thái Chờ định giá/Đề xuất), nhập số tiền vay và chọn sản phẩm vay (Loan Type).
2.  **Backend** xác thực dữ liệu:
    *   Đảm bảo Khách hàng và Cửa hàng tồn tại.
    *   Đảm bảo các Tài sản được chọn đang ở trạng thái `PROPOSED` và chưa thuộc về hợp đồng nào khác.
3.  **Hệ thống** tự động tính toán (Mô phỏng):
    *   Lấy các tham số cấu hình (Lãi phạt, phí lưu kho từ loại tài sản).
    *   Tính toán lịch trả nợ dự kiến (Gốc, Lãi, Phí) dựa trên số tiền và thời hạn.
4.  **Lưu trữ (Transaction):**
    *   Tạo bản ghi `Loan` với trạng thái `PENDING`.
    *   Cập nhật `Collateral` để liên kết với Loan vừa tạo.
    *   Lưu chi tiết lịch trả nợ vào bảng `RepaymentScheduleDetail`.
    *   Ghi nhật ký hệ thống (`AuditLog`).
5.  **Kết quả:** Trả về đối tượng Loan đầy đủ để Frontend hiển thị.

---

## 2. Xem danh sách khoản vay (List Loans)

```plantuml
@startuml
|Người dùng (Frontend)|
start
:Truy cập trang Danh sách khoản vay;
:Nhập bộ lọc (Tìm kiếm, Trạng thái, Cửa hàng);
|Hệ thống (Backend)|
:Nhận tham số Query (page, limit, filter);
:Xây dựng câu truy vấn (Prisma Where);
note right
  Filter:
  - StoreId
  - Status
  - CustomerId
  - Search (Code, Name, Phone)
end note
:Thực hiện truy vấn DB (FindMany & Count);
:Map dữ liệu sang DTO tóm tắt (Summary);
:Trả về danh sách + Phân trang (Meta);
|Người dùng (Frontend)|
:Hiển thị bảng danh sách khoản vay;
stop
@enduml
```

**Giải thích luồng xử lý:**
1.  **Người dùng** vào trang danh sách, có thể tìm kiếm theo tên khách, số điện thoại, mã hợp đồng hoặc lọc theo trạng thái (Ví dụ: Chỉ xem hồ sơ Chờ duyệt).
2.  **Backend** tiếp nhận tham số phân trang (`page`, `limit`) và các điều kiện lọc.
3.  **Hệ thống** xây dựng câu lệnh truy vấn động (Dynamic Query) để tìm các bản ghi thỏa mãn trong Database.
4.  **Kết quả:** Trả về danh sách các khoản vay dưới dạng tóm tắt (chỉ các trường quan trọng) kèm thông tin phân trang (Tổng số trang, trang hiện tại) để Frontend hiển thị lưới dữ liệu (Grid/Table).

---

## 3. Xem chi tiết khoản vay (View Loan Details)

```plantuml
@startuml
|Người dùng (Frontend)|
start
:Click vào một khoản vay trong danh sách;
|Hệ thống (Backend)|
:Nhận LoanId từ URL;
:Truy vấn DB (FindUnique);
:Include các quan hệ
(Customer, Collaterals, LoanType, Store);
if (Không tìm thấy?) then (Yes)
  :Trả về lỗi 404 Not Found;
  |Người dùng (Frontend)|
  :Hiển thị thông báo "Không tìm thấy";
  stop
else (No)
endif
|Hệ thống (Backend)|
:Map dữ liệu sang DTO chi tiết;
:Trả về dữ liệu chi tiết;
|Người dùng (Frontend)|
:Hiển thị trang chi tiết khoản vay
(Thông tin chung, Tài sản, Lịch trả nợ);
stop
@enduml
```

**Giải thích luồng xử lý:**
1.  **Người dùng** chọn xem chi tiết một hồ sơ.
2.  **Backend** tìm kiếm khoản vay theo ID.
3.  **Hệ thống** lấy kèm (Join) các thông tin liên quan:
    *   Thông tin khách hàng chi tiết.
    *   Danh sách tài sản cầm cố.
    *   Loại hình vay (Lãi suất, thời hạn).
4.  **Kết quả:** Trả về toàn bộ thông tin để Frontend hiển thị form chi tiết, cho phép người dùng xem lại kỹ lưỡng trước khi duyệt hoặc sửa đổi.

---

## 4. Cập nhật thông tin khoản vay (Update Loan - Pending only)

```plantuml
@startuml
|Người dùng (Frontend)|
start
:Sửa thông tin trên form chi tiết;
:Nhấn nút "Lưu thay đổi";
|Hệ thống (Backend)|
:Nhận yêu cầu Update (LoanId, Data);
:Kiểm tra trạng thái Loan hiện tại;
if (Status != PENDING?) then (Yes)
  :Trả về lỗi 400 (Chỉ sửa khi PENDING);
  |Người dùng (Frontend)|
  :Hiển thị lỗi nghiệp vụ;
  stop
else (No)
endif
|Hệ thống (Backend)|
:Validate dữ liệu mới
(Amount, Type, Collaterals...);
:Chụp ảnh dữ liệu cũ (Snapshot for Audit);
:Tính toán lại (Simulation) với thông tin mới;
:Bắt đầu Transaction;
fork
  :Update Loan (Số tiền, Lãi suất, ...);
fork again
  :Xử lý Collaterals
  (Thêm mới, Gỡ bỏ, Swap);
fork again
  :Xóa lịch trả nợ cũ -> Tạo lịch mới;
fork again
  :Ghi Audit Log (UPDATE_LOAN)
  với OldValue & NewValue;
end fork
:Commit Transaction;
:Trả về dữ liệu đã cập nhật;
|Người dùng (Frontend)|
:Cập nhật lại giao diện;
stop
@enduml
```

**Giải thích luồng xử lý:**
1.  **Người dùng** thay đổi thông tin hồ sơ (ví dụ: Giảm số tiền vay, đổi tài sản khác) khi hồ sơ chưa được duyệt.
2.  **Backend** kiểm tra chặt chẽ: Chỉ cho phép sửa khi trạng thái là `PENDING`.
3.  **Hệ thống** thực hiện tính toán lại toàn bộ:
    *   Nếu đổi tài sản: Kiểm tra tài sản mới có hợp lệ không.
    *   Nếu đổi số tiền/kỳ hạn: Tính lại lịch trả nợ.
4.  **Lưu trữ (Transaction):**
    *   Cập nhật bảng Loan.
    *   Cập nhật liên kết Tài sản (Gỡ tài sản cũ trả về trạng thái PROPOSED, gán tài sản mới).
    *   **Quan trọng:** Xóa lịch trả nợ cũ và tạo lại lịch trả nợ mới khớp với thay đổi.
    *   Ghi Audit Log chi tiết sự thay đổi (Trước/Sau).

---

## 5. Duyệt / Từ chối khoản vay (Approve/Reject Loan)

```plantuml
@startuml
|Người dùng (Frontend)|
start
:Xem chi tiết khoản vay (PENDING);
if (Quyết định?) then (Duyệt)
  :Nhấn nút "Duyệt" (Approve);
  :Nhập ghi chú duyệt (Optional);
else (Từ chối)
  :Nhấn nút "Từ chối" (Reject);
  :Nhập lý do từ chối (Required);
endif
|Hệ thống (Backend)|
:Nhận yêu cầu (Status, Note);
:Kiểm tra chuyển trạng thái hợp lệ?
(State Machine Check);
:Bắt đầu Transaction;
if (Action == APPROVE?) then (Yes)
  :Update Loan Status -> ACTIVE;
  :Update Collaterals -> PLEDGED;
  :Ghi Audit Log (APPROVE_LOAN);
else (No - REJECT)
  :Update Loan Status -> REJECTED;
  :Update Collaterals -> REJECTED;
  :Ghi Audit Log (REJECT_LOAN);
endif
:Commit Transaction;
|Hệ thống (Backend)|
if (Approved?) then (Yes)
  fork
    :Tạo phiếu chi (Disbursement Log);
  fork again
    :Gửi thông báo Welcome (SMS/Email);
  fork again
    :Lên lịch nhắc nợ (Reminder Jobs);
  end fork
else (No)
endif
:Trả về kết quả;
|Người dùng (Frontend)|
:Hiển thị trạng thái mới;
stop
@enduml
```

**Giải thích luồng xử lý:**
1.  **Quản lý** xem xét hồ sơ và đưa ra quyết định.
2.  **Backend** kiểm tra tính hợp lệ của việc chuyển trạng thái (chỉ PENDING mới được Approve/Reject).
3.  **Xử lý Transaction:**
    *   **Duyệt:** Chuyển trạng thái Loan sang `ACTIVE`, Tài sản sang `PLEDGED` (Đang cầm cố).
    *   **Từ chối:** Chuyển trạng thái Loan sang `REJECTED`, Tài sản sang `REJECTED` (hoặc trả lại tùy nghiệp vụ, ở đây set REJECTED theo code).
    *   Ghi Audit Log người duyệt và thời gian duyệt.
4.  **Hậu xử lý (Sau khi Commit):**
    *   Tự động tạo phiếu chi tiền (Disbursement) mặc định là Tiền mặt (Cash) để kế toán xử lý.
    *   Gửi tin nhắn/email thông báo cho khách hàng.
    *   Kích hoạt các tác vụ nền (Background Jobs) để nhắc nợ tự động trong tương lai.

---

## 6. Xem danh sách nợ quá hạn (List Overdue Loans)

```plantuml
@startuml
|Người dùng (Frontend)|
start
:Truy cập menu "Quản lý thu hồi nợ";
:Chọn bộ lọc (Số ngày quá hạn, Cửa hàng);
|Hệ thống (Backend)|
:Nhận Query;
:Truy vấn RepaymentSchedule;
note right
  Tìm các kỳ trả nợ có
  Status != PAID
  và DueDate < Today
end note
:Join bảng Loan và Customer;
:Tổng hợp dữ liệu (Aggregate);
note right
  Tính tổng tiền quá hạn,
  số ngày quá hạn lớn nhất
end note
:Trả về danh sách hồ sơ quá hạn;
|Người dùng (Frontend)|
:Hiển thị danh sách cảnh báo đỏ;
:Hỗ trợ các hành động (Gọi điện, Nhắn tin);
stop
@enduml
```

**Giải thích luồng xử lý:**
1.  **Nhân viên thu hồi nợ** truy cập chức năng để xem danh sách khách hàng đang trễ hạn.
2.  **Backend** quét bảng lịch trả nợ (`RepaymentScheduleDetail`):
    *   Lọc các bản ghi chưa thanh toán (`PENDING`/`PARTIAL`) và có ngày đến hạn (`DueDate`) nhỏ hơn ngày hiện tại.
3.  **Hệ thống** tổng hợp dữ liệu:
    *   Nhóm theo Khoản vay/Khách hàng.
    *   Tính toán tổng số tiền phạt và số ngày quá hạn.
4.  **Kết quả:** Trả về danh sách ưu tiên để nhân viên thực hiện các biện pháp nhắc nợ (Gọi điện, gửi SMS).
