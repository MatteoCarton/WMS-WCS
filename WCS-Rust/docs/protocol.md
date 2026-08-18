# Navette WCS: Telegram Interface Specification

Interface between the WCS (Warehouse Control System) and the equipment
controllers.

| | |
| --- | --- |
| Reference | NAV-WCS-ITF-001 |
| Version | 1.0 |
| Status | For review |
| Date | 2026-08-18 |
| Author | M. Carton |
| Distribution | Automation team, equipment suppliers |

In case of contradiction between this document and an implementation, this
document prevails.

---

# Part 1: Functional description

## 1.1 Scope

This document defines the messages exchanged between the WCS and the controller
of each equipment, their format, their sequencing and their error handling.

It does not cover:

- the interface between the WCS and the WMS;
- the fieldbuses internal to an equipment;
- personnel safety functions, which are hardwired and independent from any link
  described here.

## 1.2 Definitions and abbreviations

| Term | Definition |
| --- | --- |
| WCS | Warehouse Control System; material flow control of the installation |
| WMS | Warehouse Management System; stock and order management |
| PLC | Programmable Logic Controller driving one equipment |
| Equipment | Controllable machine: crane, conveyor, turntable, lift |
| Telegram | 64 byte message with fixed field positions and lengths |
| Channel | TCP connection between the WCS and one equipment |
| Load | Transported object: pallet, tote or carton |
| Point | Named location where a load can sit |
| Task | Elementary movement requested from an equipment |
| Handshake | Request and answer exchange confirming telegram reception |
| Heartbeat | Periodic telegram proving that the sender is alive |

## 1.3 Link architecture

One channel per equipment. The equipment acts as server, the WCS as client. The
channel is permanent and re-established automatically after a loss.

The WCS issues elementary move orders and receives reports. No article,
quantity or customer order information travels on this interface.

## 1.4 Operating principles

1. Every telegram is 64 bytes long.
2. Only one unacknowledged telegram is allowed at a time, per channel and per
   direction.
3. Every telegram is acknowledged, including malformed ones.
4. An already processed telegram is acknowledged again and is not processed
   twice.
5. An unacknowledged telegram is resent with the same sequence number.
6. No telegram carries a time. The receiver timestamps on reception.
7. A telegram of unknown type is logged, negatively acknowledged and ignored. It
   does not interrupt processing.
8. A refusal always carries a reason code.
9. After reconnection the WCS requests the equipment status and waits for all
   replies before issuing any order.
10. A severity 3 fault puts the equipment out of service from the WCS point of
    view until a state accepting orders is reported.

## 1.5 Configuration

The timers and counters listed in section 2.8 are read from a configuration file
and can be changed on site without recompilation.

## 1.6 Open points

| Ref | Point | Owner |
| --- | --- | --- |
| OP-01 | Final point naming scheme, to be aligned with the layout drawing | Design office |
| OP-02 | Addressing plan and port numbers | Network team |
| OP-03 | Fault codes beyond 1008, supplier specific | Suppliers |
| OP-04 | Behaviour on a connection loss longer than 60 s | Automation team |
| OP-05 | Final load id length, 12 characters provisional | Operations |

---

# Part 2: Normative specification

## 2.1 Transport

| Item | Value |
| --- | --- |
| Transport | TCP, one persistent connection per equipment |
| Roles | Equipment listens, WCS connects |
| Port | 2000 + equipment number (CR01 listens on 2001) |
| Encoding | 7-bit ASCII, uppercase only, no accented characters |
| Frame size | Exactly 64 bytes, no delimiter, no line terminator |
| Byte order | Not applicable, all fields are character fields |

A reader consumes exactly 64 bytes per telegram. A partial read is buffered until
64 bytes are available.

## 2.2 Field conventions

| Rule | Detail |
| --- | --- |
| Text fields | Left aligned, padded right with spaces |
| Numeric fields | Right aligned, padded left with zeros, digits only |
| Unused fields | Filled with spaces |
| Empty numeric | All zeros |

Field offsets are zero based. `[a, b)` means from byte `a` included to byte `b`
excluded.

## 2.3 Common header, bytes 0 to 24

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 0 | 4 | TYPE | text | Telegram type, see 2.4 |
| 4 | 6 | SEQ | num | Sequence number, 000001 to 999999, wraps to 000001 |
| 10 | 4 | FROM | text | Sender id |
| 14 | 4 | TO | text | Receiver id |
| 18 | 2 | HS | text | `R.` request, `A.` answer |
| 20 | 4 | SESS | num | Session marker, see 2.9 |

Identifiers are 4 characters: `WCS0` for the controller, `CR01` for crane 1,
`CV01` for conveyor 1, `TT01` for turntable 1.

Each direction of each channel owns its own SEQ counter. A sender increments SEQ
by 1 for every new telegram, and reuses the same SEQ when resending an
unacknowledged one.

## 2.4 Telegram catalogue

| TYPE | Direction | Meaning |
| --- | --- | --- |
| `ORDR` | WCS to equipment | Move order |
| `CANC` | WCS to equipment | Cancel a pending order |
| `STAT` | WCS to equipment | Status request |
| `ACKN` | both | Acknowledgement of a received telegram |
| `ACPT` | equipment to WCS | Order accepted, execution started |
| `REFU` | equipment to WCS | Order refused, with reason |
| `DONE` | equipment to WCS | Move finished, with result |
| `ARRV` | equipment to WCS | Load detected at a point |
| `FALT` | equipment to WCS | Equipment fault |
| `STRP` | equipment to WCS | Status reply, one per held load |
| `LIFE` | both | Heartbeat |

This list is closed. Any other value of TYPE is an unknown telegram, see 2.10.

## 2.5 Bodies, bytes 24 to 64

### ORDR

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 8 | TASK | num | Task id, unique per equipment and session |
| 32 | 12 | LOAD | text | Load id |
| 44 | 8 | SRCE | text | Source point |
| 52 | 8 | DEST | text | Destination point |
| 60 | 2 | KIND | text | `ST` store, `RT` retrieve, `MV` move, `TR` transfer |
| 62 | 2 | PRIO | num | 01 highest, 99 lowest |

### CANC

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 8 | TASK | num | Task to cancel |
| 32 | 4 | RCOD | num | Cancellation reason, see 2.7 |
| 36 | 28 | FILL | text | Spaces |

### STAT

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 40 | FILL | text | Spaces |

### ACKN

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 6 | ASEQ | num | SEQ of the acknowledged telegram |
| 30 | 4 | ACOD | num | `0000` accepted, otherwise see 2.7 |
| 34 | 30 | FILL | text | Spaces |

### ACPT

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 8 | TASK | num | Accepted task |
| 32 | 32 | FILL | text | Spaces |

### REFU

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 8 | TASK | num | Refused task |
| 32 | 4 | RCOD | num | Refusal reason, see 2.7 |
| 36 | 20 | RTXT | text | Free text, may be empty |
| 56 | 8 | FILL | text | Spaces |

### DONE

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 8 | TASK | num | Finished task |
| 32 | 12 | LOAD | text | Load actually moved |
| 44 | 8 | POSN | text | Point actually reached |
| 52 | 4 | RCOD | num | Result, see 2.7 |
| 56 | 8 | FILL | text | Spaces |

### ARRV

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 12 | LOAD | text | Load id, spaces if unreadable |
| 36 | 8 | POSN | text | Point where it was detected |
| 44 | 20 | FILL | text | Spaces |

### FALT

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 4 | FCOD | num | Fault code, see 2.7 |
| 28 | 1 | SEVR | num | 1 warning, 2 blocking, 3 safety |
| 29 | 20 | FTXT | text | Free text, may be empty |
| 49 | 15 | FILL | text | Spaces |

### STRP

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 1 | ESTA | text | Equipment state, see 2.6 |
| 25 | 12 | LOAD | text | Held load, spaces if none |
| 37 | 8 | POSN | text | Where that load sits |
| 45 | 8 | TASK | num | Task in progress, zeros if none |
| 53 | 1 | MORE | text | `Y` more replies follow, `N` last one |
| 54 | 10 | FILL | text | Spaces |

### LIFE

| Offset | Len | Name | Type | Description |
| --- | --- | --- | --- | --- |
| 24 | 1 | ESTA | text | Equipment state, see 2.6 |
| 25 | 39 | FILL | text | Spaces |

## 2.6 Equipment states

| Code | State | Accepts orders |
| --- | --- | --- |
| `I` | Idle | yes |
| `B` | Busy | yes, queued |
| `W` | Waiting for handover | no |
| `F` | Fault | no |
| `M` | Manual mode | no |
| `O` | Out of service | no |

## 2.7 Codes

### Refusal and cancellation codes

| Code | Meaning |
| --- | --- |
| `0001` | Unknown destination point |
| `0002` | Destination occupied |
| `0003` | Source empty |
| `0004` | Equipment busy, queue full |
| `0005` | Equipment in fault |
| `0006` | Equipment not in automatic mode |
| `0007` | Load id does not match the load present |
| `0008` | Task id already known |
| `0009` | Movement kind not supported by this equipment |
| `0010` | Cancelled on WCS request |

### Result codes for DONE

| Code | Meaning |
| --- | --- |
| `0000` | Completed |
| `0011` | Completed, load position deviates |
| `0012` | Aborted on fault |
| `0013` | Aborted on cancellation |

### Fault codes

| Code | Meaning | Usual severity |
| --- | --- | --- |
| `1001` | Drive fault | 2 |
| `1002` | Position lost, encoder fault | 2 |
| `1003` | Load detected out of position | 2 |
| `1004` | Photo cell blocked | 1 |
| `1005` | Emergency stop pressed | 3 |
| `1006` | Access door open | 3 |
| `1007` | Overload | 2 |
| `1008` | Drive communication timeout | 2 |

### Acknowledgement codes

| Code | Meaning |
| --- | --- |
| `0000` | Telegram accepted |
| `9001` | Unknown telegram type |
| `9002` | Wrong length |
| `9003` | Non numeric character in a numeric field |
| `9004` | Unknown sender or receiver id |
| `9005` | Unexpected sequence number |
| `9006` | Unknown session marker |

## 2.8 Timing and retries

| Parameter | Default | Meaning |
| --- | --- | --- |
| `ACK_TIMEOUT` | 2000 ms | Time to wait for an `ACKN` before resending |
| `MAX_RETRIES` | 2 | Resends after the first send, then give up and alarm |
| `WINDOW` | 1 | Unacknowledged telegrams allowed per channel and direction |
| `LIFE_INTERVAL` | 5000 ms | Time between two `LIFE` telegrams |
| `LIFE_MISSED_MAX` | 3 | Missed heartbeats before the peer is declared mute |
| `RECONNECT_DELAY` | 1000 ms | Delay before reconnecting, doubling up to 10000 ms |
| `ORDER_ACCEPT_TIMEOUT` | 5000 ms | Time to wait for `ACPT` or `REFU` after `ORDR` |

Giving up on a telegram after `MAX_RETRIES` raises an alarm and marks the channel
degraded. It never silently drops the order.

## 2.9 Session and sequence rules

1. The WCS assigns `SESS` when the connection opens: previous value plus 1,
   starting at `0001`, wrapping to `0001` after `9999`.
2. The first telegram of a connection is a `STAT` from the WCS carrying the new
   `SESS`. The equipment adopts it and echoes it in every telegram until the
   connection closes.
3. Both sides reset their `SEQ` counter to `000001` when a new session starts.
4. A telegram carrying an unknown `SESS` is answered with `ACKN` code `9006` and
   is not processed.

## 2.10 Behaviour rules

1. Every telegram except `ACKN` must be acknowledged by an `ACKN` carrying its
   `SEQ` in `ASEQ`.
2. A receiver that has already processed a `(SESS, SEQ)` pair acknowledges it
   again and does not process it a second time.
3. A sender keeps an unacknowledged telegram in an outbound buffer, marked sent
   and not yet acknowledged, until the matching `ACKN` arrives.
4. An unknown telegram type is logged in full, answered with `ACKN` code `9001`,
   and ignored. It never stops the program.
5. `ORDR` is answered by `ACPT` or `REFU` within `ORDER_ACCEPT_TIMEOUT`, then by
   `DONE` when the movement ends. A refusal always carries a reason code.
6. `FALT` with severity 3 puts the equipment out of service in the WCS view. No
   further order is sent until a `STRP` or `LIFE` reports a state that accepts
   orders again.
7. After a reconnection the WCS sends `STAT`, waits for the `STRP` series to end
   with `MORE = N`, rebuilds its tracking, and only then resumes sending orders.
8. Receivers timestamp on reception. Senders never put a time in a telegram.

## 2.11 Point naming

Points are 8 characters, left aligned, padded with spaces.

| Pattern | Example | Meaning |
| --- | --- | --- |
| `A<aisle>-<col>-<lvl>` | `A04-12-7` | Rack slot |
| `IN-<id>` | `IN-A01` | Infeed transfer point |
| `OUT-<id>` | `OUT-A01` | Outfeed transfer point |
| `CV<id>-<seg>` | `CV01-03` | Conveyor segment |
| `TT<id>` | `TT01` | Turntable |

## 2.12 Worked example

The WCS asks crane 1 to retrieve load `LPN000090412` from slot `A04-12-7` to the
outfeed point `OUT-A01`, at priority 10, during session 7.

Order sent by the WCS, sequence 42. Dots mark spaces.

```
ORDR000042WCS0CR01R.000700000117LPN000090412A04-12-7OUT-A01.RT10
```

Acknowledgement returned by the crane, sequence 88.

```
ACKN000088CR01WCS0A.00070000420000..............................
```

Then `ACPT` for task 117, then `DONE` with result `0000` when the load reaches
`OUT-A01`.

## 2.13 Compliance checklist

An implementation is compliant when it satisfies all of the following.

- [ ] Every telegram it emits is exactly 64 bytes.
- [ ] It acknowledges every telegram it receives, including malformed ones.
- [ ] It re-acknowledges a duplicate without processing it twice.
- [ ] It resends an unacknowledged telegram with the same `SEQ`.
- [ ] It survives an unknown telegram type without stopping.
- [ ] It emits `LIFE` at the configured interval, even while idle.
- [ ] It answers `STAT` with a complete `STRP` series ending with `MORE = N`.
- [ ] It never emits a refusal without a reason code.

---

## Revision history

| Version | Date | Author | Subject |
| --- | --- | --- | --- |
| 1.0 | 2026-08-18 | M. Carton | First issue |
