# Biểu đồ Use Case - Quản lý Loại tài sản (Asset Type CRUD)

Dưới đây là biểu đồ Use Case mô tả các tác vụ CRUD và quy trình nghiệp vụ cơ bản liên quan đến **Loại tài sản (Asset Type)** trong hệ thống, dựa trên API hiện có.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Nhân viên" as Employee
actor "Quản lý" as Manager

package "Quản lý Loại tài sản" {
    usecase "Xem danh sách loại tài sản" as UC_List
    usecase "Thêm loại tài sản mới" as UC_Create
    usecase "Cập nhật loại tài sản" as UC_Update
    usecase "Xóa loại tài sản" as UC_Delete
}

' Quan hệ giữa các actor
Employee <|-- Manager : Kế thừa quyền hạn

' Gán Use Case cho Actor
Employee --> UC_List

' Manager có quyền đặc biệt
Manager --> UC_Create
Manager --> UC_Update
Manager --> UC_Delete

' Note bổ sung thông tin
note right of UC_Delete
  Chỉ được xóa khi chưa có
  tài sản nào thuộc loại này
end note

@enduml
```
