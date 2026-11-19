/**
 * Runtime projection of plan.json: triggers, requirements, grants and mail rules only.
 * plan.json itself (titles, release descriptions, breadcrumbs) is spoiler material and
 * must never enter the browser bundle. rules.test.ts fails if this drifts from plan.json.
 */
import type { Spec } from './rules';

export const SPEC: Spec = {
  "baseline": {
    "compartments": [
      "LANTERN"
    ],
    "workstation": "A03-5-114"
  },
  "earnable": [
    "KESTREL",
    "HOLLOW",
    "SEXTANT",
    "TALLOW",
    "BRIAR",
    "QUARRY"
  ],
  "steps": [
    {
      "id": "S01",
      "trigger": {
        "type": "doc.read",
        "docNos": [
          "OSC-DIR-0412"
        ],
        "mode": "any"
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "oriented"
      }
    },
    {
      "id": "S02",
      "trigger": {
        "type": "anyOf",
        "of": [
          {
            "type": "doc.read",
            "docNos": [
              "OIA-08-031"
            ]
          },
          {
            "type": "search",
            "pattern": "RD-ACC-08-00412|\\b00412\\b|OIA-08-031"
          }
        ]
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "accessionHeld"
      }
    },
    {
      "id": "S03",
      "trigger": {
        "type": "doc.read",
        "docNos": [
          "OSC-2008-Q2"
        ],
        "mode": "any"
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "scanRead"
      }
    },
    {
      "id": "S04",
      "trigger": {
        "type": "form.submit",
        "form": "OSC-F-160",
        "match": {
          "documentInvolved": "OSC-2008-Q2|RD-ACC-08-00412"
        }
      },
      "requires": [
        "S03"
      ],
      "grant": {
        "kind": "compartment",
        "value": "BRIAR"
      }
    },
    {
      "id": "S05",
      "trigger": {
        "type": "doc.read",
        "docNos": [
          "OSC-MEM-08-0187",
          "OSC-MEM-08-0203"
        ],
        "mode": "all"
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "queryRead"
      }
    },
    {
      "id": "S06",
      "trigger": {
        "type": "form.submit",
        "form": "OSC-F-131",
        "match": {
          "anyField": "^\\s*790\\s*$|P-3-06-0977|P-4-07-0219|P-3-05-0142"
        }
      },
      "requires": [],
      "grant": {
        "kind": "compartment",
        "value": "HOLLOW"
      }
    },
    {
      "id": "S07",
      "trigger": {
        "type": "doc.read",
        "docNos": [
          "OSC-MEM-07-0944"
        ],
        "mode": "any"
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "mileageQuery"
      }
    },
    {
      "id": "S08",
      "trigger": {
        "type": "form.submit",
        "form": "OSC-F-126",
        "match": {
          "compartment": "^KESTREL$",
          "sponsorPn": "^(P-2-02-0091|P-3-05-0288|P-3-06-0866|P-3-07-0901)$",
          "justification": "OSC-MEM-07-0944|OSC-TRN-ENG|OSC-TRN-SEG-0[1-6]|OSC-TRN-INC-08-017|OSC-TRN-POS-08-044|OSC-TRN-RS"
        }
      },
      "requires": [
        "S07"
      ],
      "grant": {
        "kind": "compartment",
        "value": "KESTREL"
      }
    },
    {
      "id": "S09",
      "trigger": {
        "type": "transit.watch",
        "event": "SEG04"
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "seg04Witnessed"
      }
    },
    {
      "id": "S10",
      "trigger": {
        "type": "form.submit",
        "form": "OSC-F-114",
        "match": {
          "location": "(seg(ment)?\\s*0?4\\b|\\b04-\\d{2}\\b|R04)"
        }
      },
      "requires": [],
      "requiresAny": [
        "S09",
        "S08"
      ],
      "grant": {
        "kind": "compartment",
        "value": "SEXTANT"
      }
    },
    {
      "id": "S11",
      "trigger": {
        "type": "terminal.cmd",
        "pattern": "^wo\\s+FE-08-0417\\s*$"
      },
      "requires": [
        "S01"
      ],
      "grant": {
        "kind": "compartment",
        "value": "TALLOW"
      }
    },
    {
      "id": "S12",
      "trigger": {
        "type": "form.submit",
        "form": "OSC-F-114",
        "match": {
          "documents": "OSC-2008-Q2",
          "anyField": "copy\\s*(no\\.?|number)?\\s*0?7\\b"
        }
      },
      "requires": [
        "S04"
      ],
      "grant": {
        "kind": "compartment",
        "value": "QUARRY"
      }
    },
    {
      "id": "S13",
      "trigger": {
        "type": "terminal.cmd",
        "pattern": "^strength\\s+unposted\\s*$"
      },
      "requires": [
        "S06"
      ],
      "grant": {
        "kind": "flag",
        "value": "strengthRun"
      }
    },
    {
      "id": "S14",
      "trigger": {
        "type": "state",
        "condition": "count(compartments in [KESTREL,HOLLOW,SEXTANT,TALLOW,BRIAR,QUARRY]) >= 4"
      },
      "requires": [],
      "grant": {
        "kind": "flag",
        "value": "interimReview"
      }
    },
    {
      "id": "S15",
      "trigger": {
        "type": "anyOf",
        "of": [
          {
            "type": "form.submit",
            "form": "OSC-F-126",
            "match": {
              "compartment": "^ACTING-T2$",
              "sponsorPn": "^P-2-04-0218$"
            }
          },
          {
            "type": "terminal.cmd",
            "pattern": "^clearance\\s+request\\s+acting\\s*$"
          }
        ]
      },
      "requires": [
        "S14"
      ],
      "grant": {
        "kind": "acting",
        "value": "ACTING-T2"
      }
    }
  ],
  "mailQueue": [
    {
      "id": "msg-08-04102",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04106",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04131",
      "rule": {
        "type": "login"
      },
      "read": true
    },
    {
      "id": "msg-08-04298",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04305",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04362",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04417",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04433",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04459",
      "rule": {
        "type": "login"
      },
      "read": false
    },
    {
      "id": "msg-08-04470",
      "rule": {
        "type": "firstOf",
        "of": [
          {
            "type": "step",
            "step": "S01"
          },
          {
            "type": "after",
            "minutes": 6
          }
        ]
      }
    },
    {
      "id": "msg-08-04471",
      "rule": {
        "type": "after",
        "minutes": 12
      }
    },
    {
      "id": "msg-08-04472",
      "rule": {
        "type": "after",
        "minutes": 20
      }
    },
    {
      "id": "msg-08-04473",
      "rule": {
        "type": "after",
        "minutes": 30
      }
    },
    {
      "id": "msg-08-04474",
      "rule": {
        "type": "after",
        "minutes": 45
      }
    },
    {
      "id": "msg-08-04480",
      "rule": {
        "type": "step",
        "step": "S04"
      }
    },
    {
      "id": "msg-08-04481",
      "rule": {
        "type": "step",
        "step": "S06"
      }
    },
    {
      "id": "msg-08-04482",
      "rule": {
        "type": "step",
        "step": "S08"
      }
    },
    {
      "id": "msg-08-04483",
      "rule": {
        "type": "step",
        "step": "S10"
      }
    },
    {
      "id": "msg-08-04484",
      "rule": {
        "type": "step",
        "step": "S11"
      }
    },
    {
      "id": "msg-08-04485",
      "rule": {
        "type": "step",
        "step": "S12"
      }
    },
    {
      "id": "msg-08-04486",
      "rule": {
        "type": "step",
        "step": "S14"
      }
    },
    {
      "id": "msg-08-04487",
      "rule": {
        "type": "step",
        "step": "S15"
      }
    },
    {
      "id": "msg-08-04490",
      "rule": {
        "type": "audit",
        "audit": "A1",
        "delayMinutes": [
          2,
          4
        ]
      },
      "oia": true,
      "slots": [
        "workstation",
        "docNo",
        "time",
        "auditRef"
      ]
    },
    {
      "id": "msg-08-04491",
      "rule": {
        "type": "audit",
        "audit": "A2",
        "delayMinutes": [
          1,
          3
        ]
      },
      "oia": true,
      "slots": [
        "date",
        "time",
        "query",
        "count",
        "auditRef"
      ]
    },
    {
      "id": "msg-08-04492",
      "rule": {
        "type": "audit",
        "audit": "A3",
        "delayMinutes": [
          1,
          2
        ]
      },
      "oia": true,
      "slots": [
        "firstTime",
        "time",
        "count",
        "docNo",
        "auditRef"
      ]
    },
    {
      "id": "msg-08-04493",
      "rule": {
        "type": "audit",
        "audit": "A4",
        "delayMinutes": [
          8,
          12
        ]
      },
      "oia": true,
      "slots": [
        "time",
        "view",
        "duration",
        "auditRef"
      ]
    },
    {
      "id": "msg-08-04494",
      "rule": {
        "type": "audit",
        "audit": "A5",
        "delayMinutes": [
          2,
          5
        ]
      },
      "oia": true,
      "slots": [
        "pq",
        "docNo",
        "time",
        "auditRef"
      ]
    },
    {
      "id": "msg-08-04495",
      "rule": {
        "type": "audit",
        "audit": "A6",
        "delayMinutes": [
          1,
          3
        ]
      },
      "oia": true,
      "slots": [
        "time",
        "command",
        "auditRef"
      ]
    },
    {
      "id": "msg-08-04496",
      "rule": {
        "type": "audit",
        "audit": "A8",
        "delayMinutes": [
          3,
          6
        ]
      }
    },
    {
      "id": "msg-08-04497",
      "rule": {
        "type": "audit",
        "audit": "A7",
        "delayMinutes": [
          0,
          0
        ]
      },
      "slots": [
        "recipient"
      ]
    }
  ]
};
