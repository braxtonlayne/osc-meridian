---
id: hoist-shaft-data
route: /hoist/shaft-data
app: hoist
family: hoist
template: memo
docNo: OSC-MEM-07-1342
title: Hoist and Shaft Data, ALPHA Sites
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-03-24
access: { tier: 3 }
summary: Facilities Engineering data sheet for the fifteen ALPHA shaft hoists, giving type, rated rope speed, acceleration, cage capacity, rated payload and travel, with the drive settings common to all hoists.
distribution:
  - Hoist engineers, ALPHA-01 to ALPHA-05
  - Duty hoist drivers (winder house copy)
  - Shaft Hoist Control (data tables)
xrefs: [OSC-DIR-0466]
memo:
  letterhead:
    - FACILITIES ENGINEERING
    - Shafts and Tunnel Structures
    - Level 10, ALPHA-02
  memoFor: ["Distribution"]
  from: Shafts and Tunnel Structures, Facilities Engineering (FE)
  subject: Hoist and Shaft Data, ALPHA Sites (Revision 4)
  references:
    - OSC-DIR-0466, Operation of Shaft Hoists at ALPHA Sites, Rev 3
  signature: { name: "O. Garrity", title: "Tunnel Structures Engineer, for the Chief Engineer" }
  routing:
    - { office: "FE Shafts and Tunnel Structures", action: "Originator", initials: "OG", date: "2008-03-24" }
    - { office: "Hoist engineers, ALPHA sites", action: "Action", initials: "WH", date: "2008-03-26" }
---

1. This sheet replaces Revision 3. It is the data from which the Shaft Hoist Control tables are loaded, and it is read with :x[OSC-DIR-0466]. Depths are to the cage floor at the landing sill and are taken from each site's level record; they are not measured from the rope.

2. **Hoists.** Each ALPHA site has three hoists in the main shaft compartment: H1 personnel, H2 freight or vehicle, H3 emergency egress winder.

::canon-table{source="hoists" cols="id:Hoist,facility:Site,name:Type,speedFpm:Rated speed (fpm),accelSec:Acceleration (s),cagePersons:Persons,payloadLb:Payload (lb),travelFt:Travel (ft)" caption="ALPHA shaft hoists"}

3. **Landings.** The personnel hoist serves every level of its site except the Tier 1 levels. The freight and vehicle hoists serve the portal, mechanical, dining or stores, plant, depot and rail levels. The egress winders run from the collar to level 2 only. The level selector and the call stations show the landings in each hoist's stop list and no others.

4. **Drive settings, all hoists.** Creep :c[apps.hoist.model.creepFpm] fpm over the last :c[apps.hoist.model.creepFt] ft before a landing. Inspection speed :c[apps.hoist.model.inspectionFpm] fpm. Landing tolerance :c[apps.hoist.model.levelToleranceFt] ft; landing-zone vanes signal :c[apps.hoist.model.landingZoneFt] ft either side of the sill. Final limits :c[apps.hoist.model.overtravelFt] ft beyond the end landings. Emergency brake deceleration :c[apps.hoist.model.estopDecelFtps2] ft/s². Overspeed trip at :c[apps.hoist.model.overspeedPct] percent of rated speed.

5. **Load weighing.** Load cells are calibrated at :c[apps.hoist.model.personLb] lb per person for the onsetter's report. The drive is blocked above the rated payload or the rated number of persons.

6. **Exceptions.** A02-H2: the shaft is sunk below the bottom landing and the final limit is set below the sump vane, not at the standard overtravel. The sump is not a landing and is not entered in the stop list. Travel to it is booked under :x[OSC-DIR-0466], Inspection travel.

7. Corrections to this sheet are made by Shafts and Tunnel Structures only. Hoist engineers do not amend the tables at site.
