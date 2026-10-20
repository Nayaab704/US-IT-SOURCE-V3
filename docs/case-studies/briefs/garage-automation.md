PROJECT BRIEF — GARAGE AUTOMATION PLATFORM

Project Name:
Garage Automation / Garage Operations Platform

Client:
Makkah Autosales

Project Type:
Custom internal operations software for an automotive dealership / garage

Built By:
US IT Source

Purpose:
The system was built to manage the complete operational lifecycle of vehicles inside the garage, from intake through repair, parts purchasing, quality control, sale, warranty, and final record cleanup.

The goal was to replace scattered/manual workflows with one centralized application where staff can see what is happening with every vehicle and what action is required next.


CORE BUSINESS PROBLEM

Before the system, garage operations could easily become fragmented across separate processes.

Each vehicle may require:
- inspection
- multiple repair jobs
- parts requests
- vendor purchases
- purchase orders
- technician labor
- third-party repairs
- photos
- documents
- final quality checks
- sale information
- warranty information

The challenge was to connect all of these into one vehicle-centered workflow so staff would not have to track everything manually or across disconnected tools.


MAIN USER ROLES

The system supports:

1. Admin
2. Manager
3. Technician

Admin and Manager users have access to management, financial, sales, reporting, warranty, and team features.

Technicians have access to the operational work they need, such as:
- vehicles
- repairs
- parts
- work orders
- labor
- third-party repair activity

Sensitive financial, customer, sales, and administrative information is restricted based on role.


MAIN VEHICLE WORKFLOW

The vehicle lifecycle is:

Inspection
→ Repair
→ Quality Check
→ Ready for Sale
→ Sold

Important rule:
“Sold” is treated as the business/sale state rather than a normal repair workflow status.

When a vehicle is sold, the UI shows Sold instead of Ready for Sale.


VEHICLE INTAKE

Each vehicle starts with a structured intake process.

Information includes:
- VIN
- automatically generated stock number
- year
- make
- model
- trim
- color
- mileage
- main vehicle photo

VIN validation:
- 17 characters
- uppercase
- spaces removed
- duplicate VIN check

Stock numbers are automatically generated sequentially, for example:
STK-1
STK-2
STK-3

New vehicles automatically start in Inspection.


VEHICLE STATUS AUTOMATION

The workflow is partly automated.

Examples:
- New vehicle → Inspection
- First work order / required part / third-party repair → Repair
- First final checklist action → Quality Check
- Final checklist completed → Ready for Sale
- Sale recorded → display state becomes Sold

This reduces the need for employees to manually maintain statuses.


WORK ORDERS / REPAIRS

Repairs are managed through work orders connected to each vehicle.

Work orders include:
- service category
- repair description
- priority
- parts
- technician activity
- status
- repair details

Main repair statuses include:
- Needed
- Parts Needed
- Waiting Parts
- In Progress
- Completed

Status can change automatically based on what happens in the workflow.

Examples:
- Part required → Parts Needed
- PO created → Waiting Parts
- Part received → In Progress
- Repair finished → Completed


SERVICE CATEGORIES

The platform uses structured service categories such as:
- Mechanical
- Body Shop
- Paint / Cosmetic
- Glass
- Tires / Wheels
- Alignment
- AC
- Audio
- Interior / Detailing
- Electrical


PARTS MANAGEMENT

There is a centralized Parts Queue.

Parts are organized into tabs:
- Needs PO
- Ordered
- Received
- Returned
- In-House
- Pending Review
- All

The Parts Queue supports filtering/searching by:
- vehicle
- vendor
- service category
- stock number
- VIN
- part name
- vendor name

The page was designed to be operationally useful rather than just a list of records.


PART REQUESTS

Parts can be requested directly from repair/work-order workflows.

Each part request may contain:
- part name
- quantity
- vendor information
- cost
- status
- linked vehicle
- linked repair job
- purchase order
- quote history


VENDOR PRICE HISTORY

The system stores reusable vendor quote history.

When adding a part, the system can show previous vendor prices for the same or similar part.

Staff can:
- review previous pricing
- use an existing quote
- add a new vendor quote
- reuse historical vendor information later

Vendor quote history is preserved even when old vehicles are removed from the system.

This means past purchasing information remains useful for future jobs.


VENDOR MANAGEMENT

There is a dedicated Vendors section.

Vendor types can include:
- Parts Supplier
- Third-Party Repair
- Both

Vendors can be reused throughout:
- parts
- purchase orders
- third-party repair workflows


PURCHASE ORDERS

The platform includes a complete Purchase Order workflow.

Purchase orders can contain:
- vendor
- vehicle
- linked part request
- item description
- quantity
- unit cost
- shipping
- tax
- total
- notes
- status

PO statuses include:
- Ordered
- Received
- Cancelled

Receiving a part updates the linked operational workflow.

Returned parts are also supported.

Returned items can track:
- returned quantity
- returned amount
- returned shipping amount
- return reason
- return notes
- who returned it
- when it was returned

Returned costs are removed from the vehicle’s active financial totals where appropriate.


IN-HOUSE PARTS

Parts already available internally can be marked In-House.

If an In-House part later needs to be purchased, staff can move it back into the purchasing workflow using “Need to Buy Instead.”


THIRD-PARTY REPAIRS

External repair work is supported separately from internal work orders.

Third-party repair records can include:
- vendor
- vehicle
- service category
- cost
- repair status
- notes

Main third-party repair states:
- In Progress
- Complete


LABOR TRACKING

Technicians can log labor against vehicles.

Labor records can include:
- employee
- vehicle
- time worked
- hourly rate
- labor cost

Management can see full labor/financial totals.

Technicians can see their own work-related information without gaining access to management-only financial data.


FINAL QUALITY CHECKLIST

Before a vehicle becomes Ready for Sale, the system uses a final checklist.

The checklist acts as a deliberate quality-control step.

Workflow:
Repair completed
→ Quality Check
→ Final checklist complete
→ Ready for Sale

This prevents vehicles from being marked ready only because individual repair jobs were closed.


READY FOR SALE

Once all final checklist requirements are completed, the vehicle becomes Ready for Sale.

At this stage, temporary repair photos can be cleaned up to reduce long-term storage usage.


SALES

The system supports recording vehicle sales.

Sale information can include:
- sold date
- customer details
- sale price
- notes

Once a sale exists:
- the vehicle displays Sold
- the normal Ready for Sale badge is replaced by Sold


WARRANTY MANAGEMENT

A Warranty Register is included.

Warranty data can include:
- warranty start date
- duration in months
- calculated end date
- warranty type
- notes
- supporting documents

Warranty views include:
- All
- Active
- Expiring Soon
- Expired
- No Warranty


PREBOOKING

Vehicle prebooking is supported separately from the main vehicle workflow.

Prebooking is treated as a sales reservation state, not as a repair/workflow status.

A vehicle may display a Prebooked badge while still remaining in its normal operational workflow.


VEHICLE FILE

Each vehicle has a dedicated Vehicle File.

This gives a complete operational summary of that vehicle.

Main sections include:

1. Work & Parts
2. Financial
3. Activity
4. Documents

The Vehicle File can show:
- work orders
- repair status
- parts
- vendors
- purchase orders
- labor
- third-party repairs
- costs
- documents
- activity history


FINANCIAL TRACKING

Management users can view costs such as:
- parts
- shipping
- tax
- labor
- third-party repairs
- extra costs
- total vehicle investment

Returned items are adjusted correctly so returned costs do not remain included.


ACTIVITY HISTORY

The platform tracks operational actions.

Examples:
- who added a part
- who ordered it
- who received it
- who returned it
- repair activity
- workflow actions

This provides accountability and traceability.


DOCUMENTS

Vehicle-related documents can be attached to the relevant vehicle.

Document support is part of the vehicle record, although the system is intentionally designed to avoid unnecessary long-term storage growth.


PHOTOS

The system supports:
- main vehicle photo
- repair photos
- work-related photos
- final/gallery photos

Images are compressed in the browser before upload to reduce storage usage.

The main photo can be changed using “Set as Main.”


STORAGE MANAGEMENT

Storage efficiency is an important part of the application design.

Rules include:
- image compression before upload
- repair/temp photos can be deleted when no longer needed
- sold vehicle photos can be removed after sale
- expired vehicle data can be exported and then cleaned from the live system

This keeps Supabase storage usage controlled over time.


REPORTING

The system includes a Reports & Export area.

Reports include:
- monthly sold summary
- total vehicles sold
- sold this month
- sold this year
- first sale month
- sales history

Monthly sales summary records can remain even after old vehicle records are removed, allowing high-level historical reporting.


EXPIRED WARRANTY CLEANUP

The system includes a controlled cleanup workflow for old vehicles after warranty expiration.

Process:
1. Warranty expires
2. Management opens Expired Warranty Cleanup
3. Downloads an Archive CSV
4. Confirms the archive is saved
5. Deletes the vehicle from the live app

The cleanup removes old vehicle-specific operational data while preserving important reusable information such as:
- vendor records
- vendor quote history
- users
- catalog data
- monthly sales summaries


CSV ARCHIVE

Before old vehicle records are removed, important data can be exported to CSV.

The archive can include:
- stock number
- VIN
- year
- make
- model
- trim
- color
- mileage
- sold date
- customer
- phone
- email
- sale price
- warranty dates
- warranty duration
- warranty status
- total investment
- notes


DASHBOARD

The dashboard is designed around operational actions.

Main areas include:
- Action Center
- Operations
- Finance

The Action Center highlights items requiring attention.

Examples:
- critical/blocking items
- purchasing requirements
- review items
- follow-up actions

The goal is to answer:
“What needs attention right now?”


SALES SUMMARY

Dashboard sales summary includes:
- Total Vehicles Sold
- Sold This Month
- Sold This Year
- First Sale Month


TEAM MANAGEMENT

Admins can manage employees.

Capabilities include:
- approve users
- assign roles
- activate/deactivate/reactivate accounts
- edit names
- manage hourly rates
- soft-remove team members


AUTHENTICATION

The system uses Supabase Auth.

Features include:
- login
- logout
- password reset
- password change
- show/hide password
- protected routes


ROLE-BASED ACCESS CONTROL

Roles:
- Admin
- Manager
- Technician

Access is protected at both:
- application UI level
- database level

Supabase Row Level Security is used to enforce access rules.


MOBILE-FIRST DESIGN

The application was designed for actual garage use.

It works across:
- desktop
- tablet
- mobile

Mobile interfaces use:
- compact cards
- expandable content
- horizontal tab scrolling
- touch-friendly controls
- responsive layouts
- simplified operational views


PWA

The application is a Progressive Web App.

It can be installed on a phone or tablet from the browser.

PWA features include:
- installable home-screen app
- web app manifest
- service worker
- responsive app-like layout
- no native app store installation required


RELIABILITY / RESILIENCE

The application includes defensive loading behavior.

For example, the Parts Queue depends on multiple related datasets such as:
- part requests
- purchase order items
- vendor quotes
- vehicles
- vendors
- repair jobs
- user names

The loading system was hardened so that temporary failure of optional related data does not unnecessarily crash the entire Parts Queue.

This makes the app more resilient to temporary API or backend issues.


TECH STACK

Frontend:
- React
- Vite
- JavaScript / JSX
- Tailwind CSS

Backend / Database:
- Supabase
- PostgreSQL

Authentication / Security:
- Supabase Auth
- Row Level Security

File Storage:
- Supabase Storage

Deployment:
- Vercel

Version Control:
- Git
- GitHub

Application:
- Progressive Web App
- Service Worker
- Web App Manifest
- Responsive mobile-first UI
- Browser-side image compression
- CSV export


SYSTEM ARCHITECTURE IDEA

The architecture is vehicle-centered.

Most records connect back to a vehicle:

Vehicle
├── Work Orders
│   ├── Parts
│   └── Labor
├── Purchase Orders
├── Vendor Quotes
├── Third-Party Repairs
├── Photos
├── Documents
├── Checklist
├── Sale
├── Warranty
└── Activity History

This structure allows management to understand the full operational history of a vehicle from one system.


WHAT MAKES THE PROJECT IMPORTANT

This is not simply a CRUD application.

It contains connected business workflows and automation across:

- vehicle lifecycle
- repair management
- parts purchasing
- vendor management
- purchase orders
- technician work
- labor costs
- third-party repairs
- quality control
- sales
- warranty
- reporting
- storage cleanup
- user roles
- security

The main value of the system is that actions in one area affect related areas automatically.

Examples:
- requesting a part affects repair status
- creating a PO affects part/work-order status
- receiving a part allows repair work to continue
- completing final checklist changes vehicle readiness
- sale changes vehicle display state
- warranty expiration enables archive/cleanup workflow


DESIGN PRINCIPLES

The application was designed around:

1. Mobile-first operational use
2. Minimal manual status management
3. One source of truth per vehicle
4. Clear action queues
5. Role-based information visibility
6. Reusable vendor purchasing history
7. Controlled storage growth
8. Reliable long-term record handling
9. Simple UI despite complex business workflows


SHORT PROJECT SUMMARY

Garage Automation is a custom vehicle operations platform developed for Makkah Autosales.

It centralizes vehicle intake, repair work orders, parts requests, vendor pricing, purchase orders, technician labor, third-party repairs, quality checks, sales, warranties, reporting, and historical record cleanup.

The system follows each vehicle through its complete operational lifecycle and provides different role-based experiences for management and technicians.

It was built using React, Vite, Tailwind CSS, Supabase, PostgreSQL, Supabase Auth, Row Level Security, Supabase Storage, and Vercel, and is delivered as a mobile-first Progressive Web App.