"""
All report prose for the ISJ Licence 2 internship report.

write_content(H, UML) receives the high-level builder API (H) defined in
build_report.py and the dictionary of UML PNG paths (UML).
"""


def write_content(H, UML):
    # ----------------------------------------------------------------- #
    # 1. COVER PAGE (page de garde)
    # ----------------------------------------------------------------- #
    from docx.shared import RGBColor
    H.spacer()
    H.centered("REPUBLIC OF CAMEROON", bold=True)
    H.centered("Peace - Work - Fatherland")
    H.centered("MINISTRY OF HIGHER EDUCATION")
    H.centered("University of Yaounde I")
    H.centered("Institute Saint Jean (ISJ)")
    H.spacer()
    H.centered("ACADEMIC INTERNSHIP REPORT", bold=True, size=16, color=RGBColor(0x57, 0x00, 0x13))
    H.spacer()
    H.centered("Elite Events: A Multi-Tenant Platform for Event", bold=True, size=14)
    H.centered("Reservation, Ticketing and QR Code Check-In", bold=True, size=14)
    H.spacer()
    H.centered("Internship carried out from 6 July 2026 to 4 September 2026")
    H.centered("at HOOZON SARL, Douala, Cameroon")
    H.centered("In fulfilment of the requirements for the degree of")
    H.centered("Bachelor's Degree (Level 2), Computer Science")
    H.spacer()
    H.centered("Prepared and presented by")
    H.centered("DODGE Culhane", bold=True)
    H.centered("Second-year student")
    H.spacer()
    H.centered("Academic supervisor: Mme EFFA Laure, Bachelor's Degree Coordinator")
    H.centered("Professional supervisor: Mr Alfred JOHNSON, DevOps and Backend Developer")
    H.spacer()
    H.centered("Academic Year 2025 - 2026")

    # ----------------------------------------------------------------- #
    # 2. DEDICATION (page i)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("DEDICATION", bold=True)
    H.spacer()
    H.p("We dedicate this report to our parents and family, whose constant "
        "encouragement and support made our academic journey possible. We also "
        "dedicate it to the teaching staff of the Institute Saint Jean, and to "
        "all the colleagues at HOOZON SARL who welcomed us during the internship.")

    # ----------------------------------------------------------------- #
    # 3. ACKNOWLEDGEMENTS (page ii)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("ACKNOWLEDGEMENTS", bold=True)
    H.spacer()
    H.p("We would like to express our sincere gratitude to Mme EFFA Laure, "
        "Bachelor's Degree Coordinator at the Institute Saint Jean, for her "
        "academic supervision and for the guidance she provided throughout this "
        "work. Our thanks also go to Mr Alfred JOHNSON, DevOps and Backend "
        "Developer at HOOZON SARL, who supervised our work on site and shared "
        "his expertise in software development and DevOps practices.")
    H.p("We are grateful to the management and the entire team of HOOZON SARL "
        "for granting us this internship opportunity and for the welcoming "
        "environment in which we were able to learn and contribute. Finally, we "
        "thank our fellow students and friends for their encouragement.")

    # ----------------------------------------------------------------- #
    # 4. SOMMAIRE (front Table of Contents, 2 levels) (page iii)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("TABLE OF CONTENTS", bold=True)
    H.spacer()
    H.toc(levels="1-2")

    # ----------------------------------------------------------------- #
    # 5. LIST OF TABLES (page iv)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("LIST OF TABLES", bold=True)
    H.spacer()
    H.bullet("Table 1: Administrative and legal identity of HOOZON SARL")
    H.bullet("Table 2: Technology stack of the Elite Events platform")

    # ----------------------------------------------------------------- #
    # 6. LIST OF FIGURES (page v)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("LIST OF FIGURES", bold=True)
    H.spacer()
    H.bullet("Figure 1: Use-case diagram of the Elite Events platform")
    H.bullet("Figure 2: Class diagram of the Elite Events domain model")
    H.bullet("Figure 3: Sequence diagram - ticket creation and issuance")
    H.bullet("Figure 4: Sequence diagram - QR code check-in at the gate")

    # ----------------------------------------------------------------- #
    # 7. LIST OF ABBREVIATIONS (page vi)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("LIST OF ABBREVIATIONS", bold=True)
    H.spacer()
    abbr = [
        ("API", "Application Programming Interface"),
        ("HTTP", "HyperText Transfer Protocol"),
        ("JWT", "JSON Web Token"),
        ("ORM", "Object-Relational Mapping"),
        ("OTP", "One-Time Password"),
        ("PDF", "Portable Document Format"),
        ("QR", "Quick Response (code)"),
        ("RBAC", "Role-Based Access Control"),
        ("SME", "Small and Medium-sized Enterprise"),
        ("SQL", "Structured Query Language"),
        ("TLS", "Transport Layer Security"),
        ("UML", "Unified Modeling Language"),
    ]
    for a, b in abbr:
        H.p("%s: %s" % (a, b))

    # ----------------------------------------------------------------- #
    # 8. PREFACE / AVANT-PROPOS (page vii)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("PREFACE", bold=True)
    H.spacer()
    H.p("The Institute Saint Jean (ISJ), recently accredited by the CTI and "
        "awarded the EUR-ACE label, is the first Cameroonian Private Institution "
        "of Higher Education (IPES) and one of the very first private schools in "
        "sub-Saharan Africa to benefit from this prestigious recognition. This "
        "accreditation, granted for five years, allows holders of the Engineer "
        "diploma to claim the title of French State Graduate Engineer (in "
        "addition to the Cameroonian State title), a widely recognised "
        "international appellation that guarantees the quality of the training. "
        "ISJ is placed under the supervision of the National Advanced School of "
        "Engineering of Yaounde (ENSPY). Its programmes are delivered in French "
        "and English. Partner schools include UTT, 3IL, ISEP, EFREI, EPF, UMONS, "
        "ESTP, CESI, INP Grenoble, INP Clermont, ESME, ESIEA, BUILDERS, UTBM, "
        "Ontario Tech University and Northern Alberta Institute of Technology.")
    H.p("This internship report was produced as part of the Level 2 (Bachelor's "
        "Degree) curriculum in Computer Science, in the option of application "
        "development for the digital economy. It presents the work carried out "
        "during the academic internship at HOOZON SARL.")

    # ----------------------------------------------------------------- #
    # BODY STARTS -> new section, arabic numbering (handled in build_report)
    # ----------------------------------------------------------------- #
    H.sectionbreak()

    # ----------------------------------------------------------------- #
    # GENERAL INTRODUCTION (page 1)
    # ----------------------------------------------------------------- #
    H.h1("General Introduction")
    H.p("The organisation of events has become a strategic activity for many "
        "companies, particularly in a dynamic context such as that of Douala, "
        "where structures such as HOOZON SARL offer event-organisation services "
        "alongside their information-technology and digital-communication "
        "activities. However, the management of invitations, seat assignment, "
        "ticketing and guest control at the entrance is still frequently "
        "performed with manual or generic tools that are poorly suited to the "
        "specific constraints of each organiser.")
    H.p("In this report we define a few key concepts. A reservation is the "
        "allocation of a seat (or a couple of seats) to a guest for a given "
        "event. A ticket is the proof of reservation, here materialised by a "
        "unique QR code. Check-in is the act of validating a ticket at the gate "
        "using its QR code. Multi-tenancy designates a single software instance "
        "serving several independent clients, each seeing only its own data. "
        "Finally, RBAC (Role-Based Access Control) is a security model in which "
        "access rights depend on the role assigned to a user.")
    H.p("The problem we address is the following: without a dedicated platform, "
        "event organisers face double-booked seats, counterfeit or duplicated "
        "tickets, slow entry control, and a lack of reliable statistics. These "
        "difficulties reduce the quality of the service offered to clients and "
        "increase the operational risk during an event.")
    H.p("The interest of this study lies in the design and implementation of a "
        "tailored, multi-tenant solution that strengthens the event-organisation "
        "service line of HOOZON SARL while remaining reusable for its different "
        "clients. The platform, named Elite Events, covers reservation, QR-code "
        "ticketing and gate check-in.")
    H.p("The general objective is to deliver a functional prototype of the "
        "Elite Events platform, modelled with the Unified Modeling Language "
        "(UML) and built with a modern web stack. The specific objectives are to "
        "(i) model the domain and the main workflows, (ii) implement role-based "
        "authentication and secure reservation logic, and (iii) implement the "
        "QR-code ticket issuance and check-in flows.")
    H.p("This report is organised in three chapters. Chapter 1 presents the host "
        "company, HOOZON SARL, and the progress of the internship. Chapter 2 "
        "identifies the problem and analyses existing solutions. Chapter 3 "
        "presents the solution we propose, its modelling approach and its "
        "implementation.")

    # ----------------------------------------------------------------- #
    # CHAPTER 1 (target ~6 pages)
    # ----------------------------------------------------------------- #
    H.h1("Chapter 1: Presentation of the Company and Internship Progress")
    H.p("This chapter presents HOOZON SARL in its environment and describes the "
        "progress of the internship, the tasks performed, and the observations "
        "that motivated the work presented in the following chapters.")

    H.h2("1.1 Presentation of the Company")
    H.p("HOOZON SARL is a Cameroonian company specialised in a variety of "
        "services intended to meet the professional and personal needs of its "
        "clients. It is a multidisciplinary structure whose areas of expertise "
        "include computer development and digital work, real estate, and event "
        "organisation. The company positions itself as a partner for innovation "
        "and excellence, emphasising quality, performance and customer "
        "satisfaction.")

    H.h3("1.1.1 Legal and administrative identity")
    H.table(
        ["Field", "Information"],
        [
            ["Company name", "HOOZON SARL"],
            ["Legal form", "Societe a Responsabilite Limitee (SARL)"],
            ["Year founded", "2014"],
            ["Head office", "Douala, Littoral Region, Cameroon (Logpom, Station TOTAL)"],
            ["Country", "Republic of Cameroon"],
            ["Sector of activity", "Information Technology, Digital Communication, Real Estate, Event Organisation"],
            ["Website", "https://hoozonsarl.com"],
            ["Workforce", "Approximately 29 employees (privately held company)"],
            ["Main services", "Graphic design, web & platform development, digital communication strategy, real estate brokerage, event organisation"],
        ],
        caption="Administrative and legal identity of HOOZON SARL",
        source="HOOZON SARL (hoozonsarl.com) and public company directories",
    )

    H.h3("1.1.2 History and evolution")
    H.p("Founded in 2014 and based in Douala, HOOZON SARL has grown from a "
        "versatile service provider into a structured company active in several "
        "complementary sectors. Its evolution reflects the diversification of "
        "Cameroonian small and medium-sized enterprises that combine "
        "information technology with service activities such as real estate and "
        "events. The company now promotes itself as a dynamic organisation "
        "serving businesses that wish to improve their digital presence and "
        "customer engagement.")

    H.h3("1.1.3 Field of activity and services")
    H.p("The activity of HOOZON SARL covers four main areas. In information "
        "technology, the company carries out graphic design, the development of "
        "websites and platforms, and various digital works. In digital "
        "communication, it builds visibility and communication strategies for its "
        "clients. In real estate, it facilitates the purchase, sale, management "
        "and rental of properties. Finally, in event organisation, it plans and "
        "coordinates events on behalf of its clients. This last activity is "
        "directly concerned by the subject of this report, since it requires "
        "reliable tools for reservation and guest management.")

    H.h3("1.1.4 Internal and external environment")
    H.p("Internally, HOOZON SARL is organised around functional poles that "
        "correspond to its areas of activity: an information-technology / "
        "development pole, a digital-communication pole, a real-estate pole, and "
        "an event-organisation pole. These poles collaborate on multidisciplinary "
        "projects. Externally, the company evolves in the Cameroonian "
        "market of small and medium-sized enterprises, where digitalisation is a "
        "growing expectation. The external environment is characterised by "
        "increasing competition on visibility and by a rising demand for "
        "tailored digital tools that support service delivery.")

    H.h2("1.2 The Host Department and the Internship")
    H.p("The internship was carried out within the information-technology / "
        "development pole of HOOZON SARL, which is the department most directly "
        "concerned with the design and implementation of software platforms.")

    H.h3("1.2.1 Organisational placement")
    H.p("The development pole is placed under the responsibility of Mr Alfred "
        "JOHNSON, DevOps and Backend Developer, who acted as our professional "
        "supervisor. This placement is important because the event-organisation "
        "activity of the company depends on reliable software; situating the "
        "internship in the development pole makes it possible to contribute "
        "directly to the tools that support that activity.")

    H.h3("1.2.2 Internship period and framework")
    H.p("The internship took place from 6 July 2026 to 4 September 2026, for a "
        "duration of approximately nine weeks, within the premises of HOOZON SARL "
        "in Douala. It combined individual development work on the Elite Events "
        "project with collective activities such as team meetings.")

    H.h3("1.2.3 Tasks performed")
    H.p("During the internship, we contributed to the Elite Events project as a "
        "developer. The main tasks were as follows:")
    H.bullet("Working on the Elite Events project, a platform for event "
             "reservation, ticketing and QR-code check-in.")
    H.bullet("Attending team meetings in order to follow the progress of the "
             "project and to align our work with the objectives of the pole.")
    H.bullet("Carrying out standard developer duties: reading the existing code, "
             "implementing features, and respecting the conventions of the "
             "repository.")
    H.p("Nothing particular needed to be emphasised beyond the normal duties of "
        "a developer; the work was conducted as a standard contribution to a "
        "software project under professional supervision.")

    H.h3("1.2.4 Observations and problems noted")
    H.p("Through this immersion we observed that the event-organisation activity "
        "lacks a dedicated software tool adapted to the company's needs. The "
        "reservation of seats, the issuance of tickets and the control of guests "
        "at the entrance are activities that, when performed manually or with "
        "generic tools, generate errors and inefficiencies. These observations "
        "led us to identify, in the next chapter, a precise problem to which the "
        "Elite Events platform proposes a solution.")

    # ----------------------------------------------------------------- #
    # CHAPTER 2 (target ~4 pages)
    # ----------------------------------------------------------------- #
    H.h1("Chapter 2: Identification of the Problem")
    H.p("This chapter identifies a precise problem encountered by the company and "
        "its clients in the management of events, analyses its impact, and "
        "studies the existing solutions together with their limits.")

    H.h2("2.1 Statement of the problem")
    H.p("The problem we identified is the absence of an integrated, multi-tenant "
        "platform to manage the complete lifecycle of an event: from the "
        "definition of venues and seats, through the reservation by guests, to "
        "the issuance of tickets and their validation at the gate. In practice, "
        "organisers often rely on spreadsheets to track reservations and on "
        "paper or generic QR codes for entry control. This situation produces "
        "several concrete difficulties: a same seat can be assigned twice; a "
        "ticket can be duplicated or forged; the queue at the entrance slows "
        "down when control is manual; and no reliable statistics are produced "
        "for the organiser.")

    H.h2("2.2 Impact on the company")
    H.p("For HOOZON SARL, this problem has a direct impact on the quality of the "
        "event-organisation service that it sells to its clients. Errors in "
        "reservation damage the company's credibility with its clients, while "
        "the lack of reliable control at the gate weakens security and can lead "
        "to unauthorised entries. The absence of centralised data also prevents "
        "the company from capitalising on the information collected during "
        "events, which limits its ability to improve its offers. Finally, the "
        "manual workload increases the operational cost of each event.")

    H.h2("2.3 Existing solutions and their limits")
    H.p("Several categories of existing solutions can be considered. Generic "
        "ticketing platforms allow the sale and control of tickets, but they are "
        "generally not designed for multi-tenant, seat-level reservation "
        "management and they keep the data on external infrastructures that the "
        "company does not control. Spreadsheets are flexible but offer no "
        "concurrency control, no anti-fraud mechanism, and no automated "
        "check-in. Paper-based methods are simple but cannot prevent "
        "duplication and provide no traceability. Mobile-money-based payment "
        "options (for example CamPay in Cameroon) exist for subscriptions, but "
        "they are not integrated with a reservation and ticketing workflow. "
        "Consequently, none of these solutions jointly addresses multi-tenancy, "
        "seat-level reservation, QR anti-fraud control, and data sovereignty for "
        "the specific context of HOOZON SARL.")

    H.h2("2.4 Added value of the proposed approach")
    H.p("The added value of the approach we propose lies in a single platform, "
        "Elite Events, that unifies these needs for several clients (tenants) "
        "within one instance. By modelling the domain explicitly with UML and by "
        "enforcing key invariants directly in the database (for example a "
        "constraint that rejects the double-booking of a seat), the solution "
        "provides stronger guarantees than application-level checks alone. The "
        "use of QR codes for tickets, validated at the gate by assigned staff, "
        "reduces fraud and accelerates entry. These contributions are detailed "
        "in the next chapter.")

    # ----------------------------------------------------------------- #
    # CHAPTER 3 (target ~8 pages)
    # ----------------------------------------------------------------- #
    H.h1("Chapter 3: Proposed Solution")
    H.p("This chapter presents the solution we propose: the Elite Events "
        "platform. We describe the modelling approach used, the models produced "
        "with the Unified Modeling Language, the architecture and technologies "
        "retained, and the two principal workflows implemented.")

    H.h2("3.1 Modelling approach")
    H.p("To analyse and design the solution we used the Unified Modeling "
        "Language (UML), which is a standard graphical language for specifying, "
        "visualising and documenting software systems. Three types of diagrams "
        "were retained. A use-case diagram captures the functionalities expected "
        "by each category of actor. A class diagram describes the structure of "
        "the domain (the entities and their relationships). Sequence diagrams "
        "describe the dynamic behaviour of the two critical workflows: the "
        "creation of a ticket and the check-in at the gate. This modelling step "
        "preceded the implementation and guided the design of the database "
        "schema and the application programming interfaces.")

    H.h2("3.2 Use-case model")
    H.p("The use-case diagram (Figure 1) distinguishes four actors: the Super "
        "Admin, the Client Admin, the Gate Staff, and the Visitor. The Super "
        "Admin manages client organisations, grants subscriptions and consults "
        "payments. The Client Admin manages buildings and rooms, creates and "
        "manages events, manages guests, assigns seats (single or couple), "
        "issues QR tickets, previews tickets in PDF and consults the dashboard; "
        "he may also request a subscription upgrade. The Gate Staff scans tickets "
        "and consults the scan result. The Visitor self-registers to create a "
        "free account that becomes a Client Admin account. Subscriptions are "
        "driven by a mobile-money payment transaction.")
    H.figure(UML["usecase"], "Use-case diagram of the Elite Events platform.")

    H.h2("3.3 Domain / class model")
    H.p("The class diagram (Figure 2) structures the domain around the tenant "
        "(Client), which owns everything: users, buildings, events, invitees, "
        "subscriptions, payment transactions, gate-staff assignments and usage "
        "ledgers. A building contains rooms; a room can host an event. An event "
        "is composed of tables, each table containing chairs. A reservation "
        "allocates a chair (or a couple of chairs) to an invitee for an event "
        "and is linked to exactly one ticket. A ticket carries a unique QR token "
        "and a status (issued, checked-in, cancelled). Enumerations define the "
        "role of a user (Super Admin, Client Admin, Gate Staff), the type of a "
        "reservation (single, couple) and its status, as well as the status of a "
        "ticket. A couple reservation is modelled as two rows sharing a common "
        "couple group identifier, representing the selected seat and the "
        "partner seat.")
    H.figure(UML["class"], "Class diagram of the Elite Events domain model.")

    H.h2("3.4 Architecture and technologies")
    H.p("The platform is built as a web application with a clear separation "
        "between the backend (application programming interface) and the "
        "frontend (user interface). The multi-tenant design is implemented by "
        "associating every business record with a client identifier, so that a "
        "single instance serves several independent clients while isolating "
        "their data. The technology stack is summarised in Table 2.")
    H.table(
        ["Layer", "Technology"],
        [
            ["Backend", "Node.js, Express, TypeScript"],
            ["Database", "PostgreSQL 16 (Docker), raw SQL via node-postgres, node-pg-migrate"],
            ["Web frontend", "Angular 18 (standalone components)"],
            ["Modelling", "UML (use-case, class, sequence diagrams), PlantUML"],
            ["Auth & security", "JWT, e-mail OTP, Role-Based Access Control, rate limiting"],
            ["Tickets", "QR code generation, PDF generation (pdfkit)"],
        ],
        caption="Technology stack of the Elite Events platform",
        source="Author, based on the Elite Events project (README and source code)",
    )
    H.p("In accordance with the security best practices observed in the project, "
        "role enforcement is performed by the backend middleware (requireRole), "
        "not only by the frontend route guards, which are a user-experience "
        "convenience. This ensures that a Gate Staff token is rejected (HTTP 403) "
        "when it attempts to reach an Admin-only route.")

    H.h2("3.5 Ticket creation and issuance workflow")
    H.p("The ticket-creation sequence (Figure 3) begins when a Client Admin "
        "posts a reservation for an event, specifying the table, the chair, an "
        "optional partner chair for a couple reservation, the invitee and the "
        "type. The reservation service opens a database transaction, validates "
        "the room and the partner seat, inserts the invitee and the reservation "
        "(two rows for a couple, sharing a couple group identifier), generates a "
        "unique QR token, inserts the ticket, generates the QR code as a data "
        "URL, and commits. Later, the guest can preview or print the ticket as a "
        "PDF that embeds the QR code together with the event, invitee, room, "
        "table and chair details.")
    H.figure(UML["ticket"], "Sequence diagram - ticket creation and issuance.")

    H.h2("3.6 QR code check-in workflow")
    H.p("The check-in sequence (Figure 4) begins when a Gate Staff member opens "
        "the scanner and aims at the QR code; the mobile client posts the QR "
        "token to the gate-staff scan endpoint. The ticket service retrieves the "
        "ticket with its reservation, event, invitee, chair, table and room. If "
        "no ticket is found, an error is raised. Otherwise the service checks "
        "whether the event has expired and whether the ticket status is already "
        "checked-in or cancelled. When the role is Gate Staff, the service "
        "verifies that the user is assigned to the event; if not, an error is "
        "raised. The ticket is then marked as checked-in with a timestamp, and a "
        "success result containing the guest name and seat is returned to the "
        "scanner.")
    H.figure(UML["qr"], "Sequence diagram - QR code check-in at the gate.")

    H.h2("3.7 Security and data integrity")
    H.p("Beyond role-based access control, data integrity is guaranteed by "
        "database constraints. In particular, the reservations table carries a "
        "partial unique index on (event_id, chair_id) for active reservations; "
        "this means the database itself rejects the double-booking of a chair "
        "for the same event, even under concurrent requests, which is stronger "
        "than an application-level check alone. Authentication uses a "
        "role-branching login: an Admin authenticates with a username and a "
        "one-time password sent by e-mail, whereas a Gate Staff account "
        "authenticates directly and receives a token. Rate limiting protects the "
        "login and OTP endpoints against brute-force attempts.")

    # ----------------------------------------------------------------- #
    # GENERAL CONCLUSION (page ~ last)
    # ----------------------------------------------------------------- #
    H.h1("General Conclusion")
    H.p("In this report we presented the work carried out during our internship "
        "at HOOZON SARL. After presenting the company and the progress of the "
        "internship in Chapter 1, we identified in Chapter 2 the problem of the "
        "absence of an integrated, multi-tenant platform for event reservation, "
        "ticketing and gate control, together with the limits of existing "
        "solutions. In Chapter 3 we proposed the Elite Events platform: a "
        "modelled, multi-tenant solution designed with UML and built with a "
        "modern web stack, implementing secure role-based authentication, "
        "seat-level reservation protected against double-booking, QR-code ticket "
        "issuance, and gate check-in.")
    H.p("The contribution of this work is a coherent foundation that strengthens "
        "the event-organisation service line of HOOZON SARL and that can be "
        "reused for its different clients. The modelling approach (UML) made it "
        "possible to clarify the domain and the critical workflows before "
        "implementation.")
    H.p("Several perspectives can improve the work. A mobile application for the "
        "gate staff scanner could be finalised and published. The integration of "
        "mobile-money payments (such as CamPay) for client subscriptions could "
        "be completed, as already sketched in the use-case model. Finally, "
        "analytics dashboards and automated tests would increase the reliability "
        "and the operational value of the platform.")

    # ----------------------------------------------------------------- #
    # REFERENCES
    # ----------------------------------------------------------------- #
    H.h1("References")
    H.bullet("HOOZON SARL, official website, https://hoozonsarl.com (consulted August 2026).")
    H.bullet("Elite Events project, source code and README (backend: Express + TypeScript; frontend: Angular 18), internship repository, 2026.")
    H.bullet("Elite Events specification, Elite_Events_Specification.pdf and project1_updated.md, provided during the internship.")
    H.bullet("Object Management Group, Unified Modeling Language (UML) specification, https://www.omg.org/spec/UML (consulted August 2026).")
    H.bullet("Angular documentation, https://angular.dev (consulted August 2026).")
    H.bullet("PostgreSQL documentation, https://www.postgresql.org/docs (consulted August 2026).")
    H.bullet("Node.js documentation, https://nodejs.org/api (consulted August 2026).")

    # ----------------------------------------------------------------- #
    # ANNEXES
    # ----------------------------------------------------------------- #
    H.h1("Annexes")
    H.h2("Annex A: UML model sources")
    H.p("The four UML diagrams presented in Chapter 3 are produced from "
        "PlantUML source files located in the project under "
        "frontend/public/Events/uml/: class-diagram.puml, "
        "use-case-diagram.puml, sequence-ticket-creation.puml and "
        "sequence-qr-checkin.puml. The exported images "
        "(ClassDaigram.png, useCase.png, sequenceForTicket.png, "
        "sequenceForQRScann.png) are included as figures in the report.")
    H.h2("Annex B: Glossary")
    H.p("Client (tenant): an independent organisation using the platform and "
        "seeing only its own data. Client Admin: the administrator of a client "
        "organisation. Gate Staff: a user assigned to control entries at the "
        "gate. Reservation: allocation of a seat to a guest for an event. "
        "Ticket: proof of reservation materialised by a unique QR code. "
        "Check-in: validation of a ticket at the gate.")

    # ----------------------------------------------------------------- #
    # FINAL FULL TABLE OF CONTENTS (end of report)
    # ----------------------------------------------------------------- #
    H.pagebreak()
    H.centered("TABLE OF CONTENTS (COMPLETE)", bold=True)
    H.spacer()
    H.toc(levels="1-3", title=None)
