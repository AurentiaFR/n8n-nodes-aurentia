import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as account from './account/Account.resource';

type OperationFn = (this: IExecuteFunctions, i: number) => Promise<IDataObject | IDataObject[]>;

const resources: Record<string, { operations: Record<string, OperationFn> }> = {
	account: { operations: account.operations },
};

export async function router(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const operationFn = resources[resource]?.operations[operation];
	if (!operationFn) {
		throw new NodeOperationError(
			this.getNode(),
			`The operation "${operation}" is not supported for resource "${resource}"`,
		);
	}
	return operationFn.call(this, i);
}
