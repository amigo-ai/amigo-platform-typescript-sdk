import { describe, expect, it, vi } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { TEST_API_KEY, TEST_WORKSPACE_ID } from '../test-helpers.js'

const EMPTY_BODY = {} as never

function createClientWithRecorder() {
  const requests: string[] = []
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)

    requests.push(`${request.method} ${url.pathname}`)

    return Response.json({
      id: 'test-id',
      items: [],
      has_more: false,
      continuation_token: null,
      ok: true,
    })
  })

  const client = new AmigoClient({
    apiKey: TEST_API_KEY,
    workspaceId: TEST_WORKSPACE_ID,
    fetch: fetchImpl as typeof fetch,
  })

  return { client, requests, fetchImpl }
}

describe('resource surface smoke tests', () => {
  it('covers the untested public resource wrappers end-to-end', async () => {
    const { client, requests, fetchImpl } = createClientWithRecorder()

    await client.workspaces.create(EMPTY_BODY)
    await client.workspaces.list({ limit: 5 })
    await client.workspaces.get()
    await client.workspaces.update(EMPTY_BODY)
    await client.workspaces.archive(EMPTY_BODY)

    await client.apiKeys.me()
    await client.apiKeys.create(EMPTY_BODY)
    await client.apiKeys.list({ limit: 5, mine_only: true })
    await client.apiKeys.revoke('key-001')
    await client.apiKeys.rotate('key-001', EMPTY_BODY)

    await client.analytics.getDashboard({ days: 7 })
    await client.analytics.getCalls({ days: 7 })
    await client.analytics.getAgents({ period: '7d' })
    await client.analytics.getCallQuality({ days: 7 })
    await client.analytics.getEmotionTrends({ days: 7 })
    await client.analytics.getLatency({ days: 7 })
    await client.analytics.getToolPerformance({ days: 7 })
    await client.analytics.getDataQuality({ days: 7 })
    await client.analytics.getUsage({ days: 7 })
    await client.analytics.getAdvancedCallStats({ days: 7 })
    await client.analytics.compareCallPeriods({
      current_from: '2026-01-01',
      current_to: '2026-01-07',
      previous_from: '2025-12-25',
      previous_to: '2025-12-31',
    })

    await client.contextGraphs.create(EMPTY_BODY)
    await client.contextGraphs.list({ limit: 5 })
    await client.contextGraphs.get('cg-001')
    await client.contextGraphs.update('cg-001', EMPTY_BODY)
    await client.contextGraphs.delete('cg-001')
    await client.contextGraphs.createVersion('cg-001', EMPTY_BODY)
    await client.contextGraphs.listVersions('cg-001', { limit: 5 })
    await client.contextGraphs.getVersion('cg-001', 2)

    await client.dataSources.create(EMPTY_BODY)
    await client.dataSources.list({ limit: 5, status: 'healthy' })
    await client.dataSources.get('ds-001')
    await client.dataSources.update('ds-001', EMPTY_BODY)
    await client.dataSources.delete('ds-001')
    await client.dataSources.getStatus('ds-001')
    await client.dataSources.getSyncHistory('ds-001')

    await client.memory.getEntityDimensions('entity-001')
    await client.memory.getEntityFacts('entity-001', { dimension: 'preferences' })
    await client.memory.getAnalytics()

    await client.personas.list({ limit: 5, search: 'friendly' })
    await client.personas.create(EMPTY_BODY)
    await client.personas.get('persona-001')
    await client.personas.update('persona-001', EMPTY_BODY)
    await client.personas.delete('persona-001')

    await client.phoneNumbers.provision(EMPTY_BODY)
    await client.phoneNumbers.list({ limit: 5 })
    await client.phoneNumbers.get('phone-001')
    await client.phoneNumbers.update('phone-001', EMPTY_BODY)
    await client.phoneNumbers.release('phone-001')
    await client.phoneNumbers.setForwarding('phone-001', EMPTY_BODY)
    await client.phoneNumbers.clearForwarding('phone-001')

    await client.recordings.getUrls('call-001')
    await client.recordings.getMetadata('call-001')
    await client.recordings.download('call-001', 'audio.wav')

    await client.audit.list({ limit: 5 })
    await client.audit.getSummary({ date_from: '2026-01-01', date_to: '2026-01-31' })
    await client.audit.getPhiAccess({ limit: 5 })
    await client.audit.createExport(EMPTY_BODY)
    await client.audit.listExports()
    await client.audit.getEntityAccessLog('entity-001', { limit: 5 })

    await client.safety.getConfig()
    await client.safety.updateConfig(EMPTY_BODY)
    await client.safety.listTemplates()
    await client.safety.getTemplate('template-001')
    await client.safety.applyTemplate('template-001', EMPTY_BODY)

    await client.compliance.getDashboard()
    await client.compliance.getHipaa({ report_period_days: 30 })
    await client.compliance.getAccessReview()

    await client.simulations.createSession(EMPTY_BODY)
    await client.simulations.getSession('sim-001')
    await client.simulations.deleteSession('sim-001')
    await client.simulations.step(EMPTY_BODY)
    await client.simulations.recommend(EMPTY_BODY)
    await client.simulations.getIntelligence('sim-001')

    await client.skills.create(EMPTY_BODY)
    await client.skills.list({ limit: 5, search: 'lookup' })
    await client.skills.get('skill-001')
    await client.skills.update('skill-001', EMPTY_BODY)
    await client.skills.delete('skill-001')
    await client.skills.test('skill-001', EMPTY_BODY)

    await client.reviewQueue.list({ limit: 5, status: 'pending' })
    await client.reviewQueue.get('item-001')
    await client.reviewQueue.getStats()
    await client.reviewQueue.getDashboard()
    await client.reviewQueue.getMyQueue({ limit: 5 })
    await client.reviewQueue.approve('item-001', EMPTY_BODY)
    await client.reviewQueue.reject('item-001', EMPTY_BODY)
    await client.reviewQueue.claim('item-001')
    await client.reviewQueue.unclaim('item-001')
    await client.reviewQueue.correct('item-001', EMPTY_BODY)
    await client.reviewQueue.batchApprove(EMPTY_BODY)
    await client.reviewQueue.batchReject(EMPTY_BODY)
    await client.reviewQueue.getHistory({ limit: 5 })
    await client.reviewQueue.getTrends({ days: 7 })
    await client.reviewQueue.getPerformance({ days: 7 })
    await client.reviewQueue.getCorrectionSchema('item-001')
    await client.reviewQueue.getDiff('item-001')

    await client.webhookDestinations.list({ limit: 5 })
    await client.webhookDestinations.create(EMPTY_BODY)
    await client.webhookDestinations.get('dest-001')
    await client.webhookDestinations.update('dest-001', EMPTY_BODY)
    await client.webhookDestinations.delete('dest-001')
    await client.webhookDestinations.listDeliveries('dest-001', { limit: 5 })
    await client.webhookDestinations.rotateSecret('dest-001')

    await client.functions.list()
    await client.functions.create(EMPTY_BODY)
    await client.functions.delete('lookup_patient')
    await client.functions.test('lookup_patient', EMPTY_BODY)
    await client.functions.getCatalog()
    await client.functions.query(EMPTY_BODY)
    await client.functions.sync()

    await client.world.listEntities({ limit: 5, q: 'Jane' })
    await client.world.getEntity('entity-001')
    await client.world.getRelationships('entity-001')
    await client.world.getGraph('entity-001')
    await client.world.getProvenance('entity-001')
    await client.world.getLineage('entity-001')
    await client.world.getMerged('entity-001')
    await client.world.listEntityTypes()
    await client.world.listDuplicates({ entity_type: 'patient' })
    await client.world.search({ q: 'Jane Doe', entity_type: 'patient', limit: 5 })
    await client.world.getTimeline('entity-001', { limit: 5 })
    await client.world.getSyncStatusBySink()
    await client.world.listSyncEvents({ status: 'pending', limit: 5 })
    await client.world.getSyncQueueDepth()
    await client.world.retrySyncEvent('sync-001')
    await client.world.retryAllSyncEvents()
    await client.world.getStats()
    await client.world.getSourceBreakdown()

    expect(fetchImpl).toHaveBeenCalled()
    expect(requests).toEqual(
      expect.arrayContaining([
        'GET /v1/auth/me',
        `GET /v1/${TEST_WORKSPACE_ID}/analytics/calls/comparison`,
        `POST /v1/${TEST_WORKSPACE_ID}/webhook-destinations/dest-001/rotate-secret`,
        `GET /v1/${TEST_WORKSPACE_ID}/world/entities/entity-001/graph`,
        `POST /v1/workspaces/${TEST_WORKSPACE_ID}/archive`,
      ]),
    )
  })
})
