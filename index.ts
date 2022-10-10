"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_ssm_1 = require("@aws-sdk/client-ssm");
const core = __importStar(require("@actions/core"));
async function main() {
    var _a, _b;
    const credentials = {
        accessKeyId: core.getInput('aws-access-key-id'),
        secretAccessKey: core.getInput('aws-secret-access-key'),
    };
    const region = core.getInput('aws-region');
    const client = new client_ssm_1.SSMClient({ region, credentials });
    const TimeoutSeconds = parseInt(core.getInput('timeout'));
    const parameters = core.getInput('parameters', { required: true });
    const command = new client_ssm_1.SendCommandCommand({
        TimeoutSeconds,
        Targets: JSON.parse(core.getInput('targets', { required: true })),
        DocumentName: core.getInput('document-name'),
        Parameters: JSON.parse(parameters),
    });
    if (core.isDebug()) {
        core.debug(parameters);
        core.debug(JSON.stringify(command));
    }
    const result = await client.send(command);
    const CommandId = (_a = result.Command) === null || _a === void 0 ? void 0 : _a.CommandId;
    core.setOutput('command-id', CommandId);
    const int32 = new Int32Array(new SharedArrayBuffer(4));
    const outputs = [];
    let hasErrors = false;
    let status = 'Pending';
    for (let i = 0; i < TimeoutSeconds; i++) {
        Atomics.wait(int32, 0, 0, 1000);
        const result = await client.send(new client_ssm_1.ListCommandInvocationsCommand({ CommandId, Details: true }));
        const invocation = ((_b = result.CommandInvocations) === null || _b === void 0 ? void 0 : _b[0]) || {};
        status = invocation.Status;
        if (['Success', 'Failure'].includes(status)) {
            for (const cp of invocation.CommandPlugins || []) {
                const output = cp.Output;
                outputs.push(output);
                hasErrors = output.includes('----------ERROR-------');
            }
            break;
        }
    }
    core.setOutput('status', status);
    core.setOutput('output', outputs.join('\n'));
    if (status != 'Success') {
        throw new Error(`Failed to send command: ${status}`);
    } else if (hasErrors) {
        throw new Error('Send command succeeded, however see reported script ERROR(s) in Get Outputs step.')
    }
}
main().catch(e => core.setFailed(e.message));
exports.default = main;
