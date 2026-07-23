import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { simplifyToggle } from '../common.descriptions';
import { pickFields } from '../../helpers/utils';

const SIMPLIFY_FIELDS = [
	'id',
	'title',
	'value',
	'currency',
	'probability_percent',
	'stage_id',
	'contact_id',
	'expected_close_date',
	'created_at',
];

export const description: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the deal to retrieve',
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const dealId = this.getNodeParameter('dealId', i) as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const deal = await aurentiaApiRequest.call(this, 'GET', `/api/aurentia/crm/deals/${dealId}`);
	return simplify ? pickFields(deal, SIMPLIFY_FIELDS) : deal;
}
