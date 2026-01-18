# Biểu đồ Use Case - Quản lý Khoản vay (Loan CRUD)

Dưới đây là biểu đồ Use Case mô tả các tác vụ CRUD và quy trình nghiệp vụ cơ bản liên quan đến **Khoản vay (Loan)** trong hệ thống, dựa trên API hiện có.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Nhân viên" as Employee
actor "Quản lý" as Manager

package "Quản lý Khoản vay" {
    usecase "Tạo hồ sơ vay mới" as UC_Create
    usecase "Xem danh sách khoản vay" as UC_List
    usecase "Xem chi tiết khoản vay" as UC_Detail
    usecase "Cập nhật thông tin khoản vay\n(Khi chưa duyệt)" as UC_Update_Info
    usecase "Duyệt / Từ chối khoản vay" as UC_Approve_Reject
    usecase "Xem danh sách nợ quá hạn" as UC_Overdue
}

' Quan hệ giữa các actor
Employee <|-- Manager : Kế thừa quyền hạn

' Gán Use Case cho Actor
Employee --> UC_Create
Employee --> UC_List
Employee --> UC_Detail
Employee --> UC_Update_Info
Employee --> UC_Overdue

' Manager có quyền đặc biệt
Manager --> UC_Approve_Reject

' Note bổ sung thông tin
note right of UC_Update_Info
  Chỉ được phép sửa đổi khi
  trạng thái là PENDING (Chờ duyệt)
end note

note right of UC_Approve_Reject
  Chuyển trạng thái sang
  ACTIVE (Đã duyệt) hoặc
  REJECTED (Từ chối)
end note

@enduml
```
