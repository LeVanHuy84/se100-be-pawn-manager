# Biểu đồ Use Case - Quản lý Tài sản Cầm cố (Collateral CRUD)

Dưới đây là biểu đồ Use Case mô tả các tác vụ CRUD và quy trình nghiệp vụ cơ bản liên quan đến **Tài sản Cầm cố (Collateral Asset)** trong hệ thống, dựa trên API hiện có.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Nhân viên" as Employee
actor "Quản lý" as Manager

package "Quản lý Tài sản Cầm cố" {
    usecase "Xem danh sách tài sản" as UC_List
    usecase "Xem chi tiết tài sản" as UC_Detail
    usecase "Tạo tài sản cầm cố mới" as UC_Create
    usecase "Cập nhật thông tin tài sản" as UC_Update
    usecase "Cập nhật vị trí lưu kho" as UC_Update_Location
    usecase "Tạo hồ sơ thanh lý" as UC_Liquidation
    usecase "Bán tài sản (Hoàn tất thanh lý)" as UC_Sell
}

' Quan hệ giữa các actor
Employee <|-- Manager : Kế thừa quyền hạn

' Gán Use Case cho Actor
Employee --> UC_List
Employee --> UC_Detail
Employee --> UC_Create
Employee --> UC_Update
Employee --> UC_Update_Location
Employee --> UC_Liquidation

' Manager có quyền đặc biệt
Manager --> UC_Sell

' Note bổ sung thông tin
note right of UC_Liquidation
  Chuyển trạng thái tài sản
  sang LIQUIDATING (Đang thanh lý)
end note

note right of UC_Sell
  Hoàn tất việc bán tài sản
  và ghi nhận doanh thu
end note

@enduml
```
