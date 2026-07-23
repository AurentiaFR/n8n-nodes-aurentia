import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as account from './account/Account.resource';
import * as contact from './contact/Contact.resource';
import * as deal from './deal/Deal.resource';
import * as project from './project/Project.resource';
import * as record from './record/Record.resource';
import * as socialPost from './socialPost/SocialPost.resource';
import * as task from './task/Task.resource';
import { GENERATED_RESOURCE_BY_VALUE } from './generated';
import { executeGenerated } from './generated/executor';

type OperationFn = (this: IExecuteFunctions, i: number) => Promise<IDataObject | IDataObject[]>;

const resources: Record<string, { operations: Record<string, OperationFn> }> = {
	account: { operations: account.operations },
	contact: { operations: contact.operations },
	deal: { operations: deal.operations },
	project: { operations: project.operations },
	record: { operations: record.operations },
	socialPost: { operations: socialPost.operations },
	task: { operations: task.operations },
};

export async function router(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// Curated resources: hand-authored operation functions (premium UX).
	const operationFn = resources[resource]?.operations[operation];
	if (operationFn) {
		return operationFn.call(this, i);
	}

	// Generated resources (the long tail mirrored from the MCP registry): the
	// generic executor drives them from their routeSpec + properties.
	if (GENERATED_RESOURCE_BY_VALUE[resource]) {
		return executeGenerated.call(this, resource, operation, i);
	}

	throw new NodeOperationError(
		this.getNode(),
		`The operation "${operation}" is not supported for resource "${resource}"`,
	);
}
