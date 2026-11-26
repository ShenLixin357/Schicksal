import assert from "node:assert/strict";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function deploymentBinding(settings, environment = process.env) {
    const account = settings.account_id || environment.CLOUDFLARE_ACCOUNT_ID;
    assert.match(account || "", /^[a-f0-9]{32}$/i, "Set the existing Cloudflare account ID; deployment never selects an account implicitly.");
    if (settings.account_id && environment.CLOUDFLARE_ACCOUNT_ID)
        assert.equal(settings.account_id, environment.CLOUDFLARE_ACCOUNT_ID, "Conflicting Cloudflare accounts");
    assert.ok(settings.assets?.run_worker_first === true, "Private assets must pass through the Worker first");
    assert.equal(settings.preview_urls, false, "Private preview URLs must remain disabled");
    assert.equal(settings.d1_databases?.length, 1, "Expected exactly the existing DB binding");
    const binding = settings.d1_databases[0];
    assert.equal(binding.binding, "DB");
    const databaseId = binding.database_id || environment.SCHICKSAL_D1_DATABASE_ID;
    assert.match(databaseId || "", uuid, "Set SCHICKSAL_D1_DATABASE_ID to the existing UUID; no database will be auto-created.");
    assert.notEqual(databaseId, "00000000-0000-4000-8000-000000000000", "Do not deploy the Sites placeholder DB");
    if (binding.database_id && environment.SCHICKSAL_D1_DATABASE_ID)
        assert.equal(binding.database_id, environment.SCHICKSAL_D1_DATABASE_ID, "Conflicting D1 databases");
    return { accountId: account, databaseId, databaseName: binding.database_name };
}
