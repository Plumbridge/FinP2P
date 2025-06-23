"use strict";
// Core FinP2P Types and Interfaces
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = exports.LedgerType = exports.MessageType = exports.RouterStatus = exports.TransferStatus = exports.DualConfirmationStatus = void 0;
var DualConfirmationStatus;
(function (DualConfirmationStatus) {
    DualConfirmationStatus["PENDING"] = "pending";
    DualConfirmationStatus["PARTIAL_CONFIRMED"] = "partial_confirmed";
    DualConfirmationStatus["DUAL_CONFIRMED"] = "dual_confirmed";
    DualConfirmationStatus["FAILED"] = "failed";
})(DualConfirmationStatus || (exports.DualConfirmationStatus = DualConfirmationStatus = {}));
var TransferStatus;
(function (TransferStatus) {
    TransferStatus["PENDING"] = "pending";
    TransferStatus["ROUTING"] = "routing";
    TransferStatus["EXECUTING"] = "executing";
    TransferStatus["COMPLETED"] = "completed";
    TransferStatus["FAILED"] = "failed";
    TransferStatus["CANCELLED"] = "cancelled";
})(TransferStatus || (exports.TransferStatus = TransferStatus = {}));
var RouterStatus;
(function (RouterStatus) {
    RouterStatus["ONLINE"] = "online";
    RouterStatus["OFFLINE"] = "offline";
    RouterStatus["MAINTENANCE"] = "maintenance";
})(RouterStatus || (exports.RouterStatus = RouterStatus = {}));
var MessageType;
(function (MessageType) {
    MessageType["TRANSFER_REQUEST"] = "transfer_request";
    MessageType["TRANSFER_RESPONSE"] = "transfer_response";
    MessageType["ROUTE_DISCOVERY"] = "route_discovery";
    MessageType["ROUTE_RESPONSE"] = "route_response";
    MessageType["HEARTBEAT"] = "heartbeat";
    MessageType["ERROR"] = "error";
})(MessageType || (exports.MessageType = MessageType = {}));
var LedgerType;
(function (LedgerType) {
    LedgerType["SUI"] = "sui";
    LedgerType["HEDERA"] = "hedera";
    LedgerType["APTOS"] = "aptos";
    LedgerType["FABRIC"] = "fabric";
    LedgerType["MOCK"] = "mock";
})(LedgerType || (exports.LedgerType = LedgerType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["CONFIRMED"] = "confirmed";
    TransactionStatus["FAILED"] = "failed";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
//# sourceMappingURL=index.js.map