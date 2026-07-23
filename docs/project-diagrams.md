# Tesano Community Library Diagrams

These simplified diagrams use the formal notation from the accepted sample while showing only the main parts of this library system.

## Diagram Symbol Conventions

The diagrams use these standard conventions:

| Diagram | Symbol | Meaning |
|---|---|---|
| Use case | Stick figure | Actor outside the system |
| Use case | Oval | User goal or system function |
| Use case | System boundary rectangle | Scope of the application |
| Architecture | Layered rectangle | Presentation, application, or data layer |
| Architecture | Database cylinder | Persistent database or session store |
| Data flow | Rectangle | External entity or data store |
| Data flow | Circle | Process that transforms data |
| Data flow | Arrow | Named data movement |
| Sequence | Lifeline and arrow | Participant interaction over time |
| Activity | Rounded action box | Activity or task |
| Activity | Diamond | Decision or condition |
| Activity | Filled start/stop circle | Beginning or end of a flow |
| ERD (Chen) | Rectangle | Entity |
| ERD (Chen) | Diamond | Relationship between entities |
| ERD (Chen) | Oval | Entity attribute |
| ERD (Chen) | Underlined attribute | Primary key |
| Wireframe | Rectangle viewport | Screen boundary and interface region |

The ERD intentionally uses Chen notation, matching the accepted sample. The DFD uses a simple Yourdon-style presentation: external entities and data stores are rectangles, processes are circles, and every meaningful connection is a labeled arrow.

## 1. Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam packageStyle rectangle

actor Member
actor Administrator as Admin

rectangle "TESANO COMMUNITY LIBRARY SYSTEM" {
  usecase "Sign in / Register" as Login
  usecase "Browse Books" as Browse
  usecase "Borrow or Reserve Book" as Borrow
  usecase "Manage Membership" as Membership
  usecase "Review Book" as Review
  usecase "Register for Event" as Event
  usecase "Join Reading Challenge" as Challenge

  usecase "Manage Books" as Books
  usecase "Manage Users" as Users
  usecase "Manage Loans and Fines" as Loans
  usecase "Manage Events" as Events
  usecase "View Analytics" as Analytics
}

Member --> Login
Member --> Browse
Member --> Borrow
Member --> Membership
Member --> Review
Member --> Event
Member --> Challenge

Admin --> Login
Admin --> Books
Admin --> Users
Admin --> Loans
Admin --> Events
Admin --> Analytics
@enduml
```

## 2. System Architecture Diagram

```plantuml
@startuml
skinparam shadowing false
skinparam componentStyle rectangle

rectangle "PRESENTATION LAYER" {
  rectangle "Browser\nHTML | CSS | JavaScript" as UI
}

rectangle "APPLICATION / LOGIC LAYER" {
  rectangle "Node.js + Express\nRoutes | Authentication | Services" as API
}

rectangle "DATA STORAGE LAYER" {
  database "Supabase PostgreSQL\nUsers | Books | Loans | Events" as DB
  database "Session Store" as Session
}

cloud "File Storage" as Storage
cloud "Email Service" as Email

UI -down-> API : HTTP / JSON
API -down-> DB : SQL
API -right-> Session : sessions
API -right-> Storage : PDFs / covers
API -right-> Email : verification / notices
@enduml
```

## 3. Data-Flow Diagram

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam linetype ortho
skinparam nodesep 70
skinparam ranksep 90

rectangle "Administrator" as Admin
rectangle "Member" as Member

circle "1. Authenticate" as P1
circle "2. Manage Books" as P2
circle "3. Manage Loans" as P3
circle "4. Manage Events" as P4

rectangle "D1 Users" as D1
rectangle "D2 Books" as D2
rectangle "D3 Loans and Memberships" as D3
rectangle "D4 Events" as D4

' Keep the process column vertical, like the accepted reference diagram.
P1 -[hidden]down-> P2
P2 -[hidden]down-> P3
P3 -[hidden]down-> P4

' Keep the data-store column aligned with its corresponding process.
D1 -[hidden]down-> D2
D2 -[hidden]down-> D3
D3 -[hidden]down-> D4

Admin -right-> P2 : manage books
Admin -right-> P3 : manage loans
Admin -right-> P4 : create event
Member -right-> P1 : login details
Member -right-> P2 : search books
Member -right-> P3 : borrow or reserve
Member -right-> P4 : register

P1 -right-> D1 : verify user
P2 -right-> D2 : book data
P3 -right-> D3 : loan record
P4 -right-> D4 : event record

P1 -left-> Member
P2 -left-> Member
P3 -left-> Member
P4 -left-> Member
@enduml
```

## 4. Sequence Diagram: Borrow a Book

```plantuml
@startuml
actor Member
participant "Library UI" as UI
participant "Express API" as API
database PostgreSQL as DB

Member -> UI : Select book
UI -> API : Borrow request
API -> DB : Check membership
DB --> API : Membership status
API -> DB : Check availability
DB --> API : Available?

alt Available
  API -> DB : Save borrowed_books record
  DB --> API : Due date
  API --> UI : Borrow successful
  UI --> Member : Display due date
else Not available
  API -> DB : Save reservation and queue position
  DB --> API : Queue position
  API --> UI : Reservation successful
  UI --> Member : Display queue position
end
@enduml
```

## 5. Activity Diagram: Member Borrowing Journey

```plantuml
@startuml
start
:Open library;
if (Signed in?) then (yes)
else (no)
  :Register or sign in;
endif
:Search for a book;
:Open book details;
if (Book available?) then (yes)
  if (Active membership?) then (yes)
    :Borrow book;
    :Show due date;
  else (no)
    :Apply for membership;
  endif
else (no)
  :Join reservation queue;
  :Show queue position;
endif
:Return to library;
stop
@enduml
```

## 6. Entity-Relationship Diagram

This conceptual ERD focuses on the entities used by the main borrowing workflow. It uses Chen notation rather than database-table boxes: entities are rectangles, relationships are diamonds, and attributes are ovals. Other tables such as events, challenges, and badges support additional modules and are omitted to keep the figure readable.

```plantuml
@startuml
skinparam shadowing false
skinparam linetype ortho
skinparam nodesep 45
skinparam ranksep 55

' Chen notation: rectangles = entities, diamonds = relationships, ovals = attributes.

rectangle "USER" as User
rectangle "BOOK" as Book
rectangle "MEMBERSHIP" as Membership
rectangle "BORROWED BOOK" as Borrowed
rectangle "RESERVATION" as Reservation
rectangle "FINE" as Fine

diamond "has" as HasMembership
diamond "borrows" as Borrows
diamond "reserves" as Reserves
diamond "creates" as CreatesFine

usecase "<u>userId</u>" as UserId
usecase "username" as Username
usecase "email" as Email
usecase "role" as Role

usecase "<u>bookId</u>" as BookId
usecase "title" as Title
usecase "author" as Author

usecase "<u>membershipId</u>" as MembershipId
usecase "status" as MembershipStatus

usecase "<u>borrowId</u>" as BorrowId
usecase "dueDate" as DueDate
usecase "returnDate" as ReturnDate

usecase "<u>reservationId</u>" as ReservationId
usecase "queuePosition" as QueuePosition

usecase "<u>fineId</u>" as FineId
usecase "amount" as Amount

User - HasMembership : 1
HasMembership - Membership : N
User - Borrows : 1
Borrows - Borrowed : N
Book - Borrows : 1
Borrows - Book : N
User - Reserves : 1
Reserves - Reservation : N
Book - Reserves : 1
Reserves - Book : N
Borrowed - CreatesFine : 1
CreatesFine - Fine : N

User - UserId
User - Username
User - Email
User - Role
Book - BookId
Book - Title
Book - Author
Membership - MembershipId
Membership - MembershipStatus
Borrowed - BorrowId
Borrowed - DueDate
Borrowed - ReturnDate
Reservation - ReservationId
Reservation - QueuePosition
Fine - FineId
Fine - Amount

legend right
  |= Shape |= Chen meaning |
  | rectangle | Entity |
  | diamond | Relationship |
  | oval | Attribute |
  | underlined text | Primary key |
endlegend
@enduml
```

## 7. UI Wireframes

### Member Dashboard

```plantuml
@startuml
skinparam shadowing false
skinparam rectangle {
  RoundCorner 10
}

rectangle "MEMBER DASHBOARD" {
  rectangle "Logo             Search      Profile" as Header
  rectangle "Welcome back\nSearch books by title or author" as Search
  rectangle "BOOKS\n[Cover] Title   [Borrow]\n[Cover] Title   [Reserve]" as Books
  rectangle "MY LOANS\nBook title - Due date\nCurrent fines" as Loans
  rectangle "MEMBERSHIP | EVENTS | CHALLENGES" as Community
  rectangle "Home        Books        Profile" as Bottom
  Header -down- Search
  Search -down- Books
  Books -down- Loans
  Loans -down- Community
  Community -down- Bottom
}
@enduml
```

### Admin Dashboard

```plantuml
@startuml
skinparam shadowing false
skinparam rectangle {
  RoundCorner 10
}

rectangle "ADMIN DASHBOARD" {
  rectangle "Logo          Admin account       Logout" as Header
  rectangle "Dashboard | Books | Users | Loans | Events" as Nav
  rectangle "Users  000     Books  000     Loans  000" as Stats
  rectangle "Recent books and users\nRecord        Status       Action\n[Edit]        [Approve]    [Delete]" as Table
  rectangle "Analytics summary\nPopular books | Recent activity" as Analytics
  Header -down- Nav
  Nav -down- Stats
  Stats -down- Table
  Table -down- Analytics
}
@enduml
```

Suggested report captions: `Figure 3.1 Use Case Diagram`, `Figure 3.2 System Architecture`, `Figure 3.3 Data-Flow Diagram`, `Figure 3.4 Sequence Diagram`, `Figure 3.5 Activity Diagram`, `Figure 3.6 Entity-Relationship Diagram`, and `Figure 4.1 UI Wireframes`.

## Notation References

- [Lucidchart: Entity-relationship diagrams](https://www.lucidchart.com/pages/er-diagrams) describes Chen notation as rectangles for entities, diamonds for relationships, ovals for attributes, and cardinality on relationships.
- [Lucidchart: Data-flow diagrams](https://www.lucidchart.com/pages/data-flow-diagram) identifies external entities, processes, data stores, and labeled data-flow arrows as the four core DFD components.
- [Visual Paradigm: What is a Data Flow Diagram?](https://www.visual-paradigm.com/guide/data-flow-diagram/what-is-data-flow-diagram/) documents DFD process, data-flow, data-store, external-entity, numbering, and no-cross-line conventions.
- [Visual Paradigm: UML diagram tools](https://www.visual-paradigm.com/features/uml-tool/) identifies use-case, sequence, and activity diagrams as UML diagram types.
