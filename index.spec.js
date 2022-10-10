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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const client_ssm_1 = require("@aws-sdk/client-ssm");
const index_1 = __importDefault(require("./index"));
jest.mock('@actions/core');
jest.mock('@aws-sdk/client-ssm');
const MockedClient = client_ssm_1.SSMClient;
const MockedSendCommand = client_ssm_1.SendCommandCommand;
const getInput = core.getInput;
const DEFAULT_INPUTS = new Map([
    ['aws-access-key-id', 'aws-access-key-id'],
    ['aws-secret-access-key', 'aws-secret-access-key'],
    ['aws-region', 'aws-region'],
    ['timeout', '60'],
    ['targets', '[{"Key":"InstanceIds","Values":["i-1234567890"]}]'],
    ['document-name', 'AWS-RunShellScript'],
    ['parameters', '{"commands":["ls -al"]}'],
]);
describe("aws-ssm-send-command-action", () => {
    beforeEach(() => {
        getInput.mockImplementation((key) => DEFAULT_INPUTS.get(key));
    });
    it("set successful outputs if the status is Success", async () => {
        const CommandId = 'CommandId', Status = 'Success', Output = 'Output';
        const send = jest.fn((arg) => {
            if (arg instanceof client_ssm_1.SendCommandCommand) {
                return { Command: { CommandId } };
            }
            else {
                return { CommandInvocations: [{ Status, CommandPlugins: [{ Status, Output }] }] };
            }
        });
        MockedClient.mockImplementation(() => ({ send }));
        await (0, index_1.default)();
        const { calls } = send.mock;
        expect(calls[0][0].constructor).toBe(client_ssm_1.SendCommandCommand);
        expect(calls[1][0].constructor).toBe(client_ssm_1.ListCommandInvocationsCommand);
        const command = MockedSendCommand.mock.calls[0][0];
        expect(command.Targets).toEqual(JSON.parse(DEFAULT_INPUTS.get('targets')));
        expect(command.DocumentName).toEqual(DEFAULT_INPUTS.get('document-name'));
        expect(command.Parameters).toEqual(JSON.parse(DEFAULT_INPUTS.get('parameters')));
        expect(core.setOutput).toHaveBeenCalledWith('status', 'Success');
    });
    it("waits and retries until the status is not InProgress", async () => {
        const CommandId = 'CommandId', Output = 'Output';
        let Status = 'InProgress';
        let attempts = 0;
        const send = jest.fn((arg) => {
            if (arg instanceof client_ssm_1.SendCommandCommand) {
                return { Command: { CommandId } };
            }
            else {
                if (attempts == 0) {
                    attempts += 1;
                    return { CommandInvocations: [{ Status, CommandPlugins: [{ Status, Output }] }] };
                }
                Status = 'Success';
                return { CommandInvocations: [{ Status, CommandPlugins: [{ Status, Output }] }] };
            }
        });
        MockedClient.mockImplementation(() => ({ send }));
        await (0, index_1.default)();
        expect(send).toHaveBeenCalledTimes(3);
        expect(core.setOutput).toHaveBeenCalledWith('status', 'Success');
    });
});
