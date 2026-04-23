import { createClient, requireEnv } from '../shared.js'

const client = createClient()
const encounterId = requireEnv('AMIGO_ENCOUNTER_ID')

// Fetch the encounter entity from the world model
const encounter = await client.world.getEntity(encounterId)

console.log('Encounter:', encounter.display_name)
console.log('Type:', encounter.entity_type)
console.log('State:', JSON.stringify(encounter.state, null, 2))

// Get the encounter's event timeline
const timeline = await client.world.getTimeline(encounterId, { limit: 20 })

console.log(`\nTimeline (${timeline.events.length} events):`)
for (const event of timeline.events) {
  console.log(`  ${event.created_at} - ${event.domain}.${event.event_type}`)
}

// Approve ICD-10 codes
console.log('\nApproving ICD-10 codes...')

const codesToApprove = ['J06.9', 'R05.9']
for (const code of codesToApprove) {
  await client.POST(
    '/v1/{workspace_id}/scribe/encounters/{encounter_id}/icd10/approve',
    {
      params: { path: { encounter_id: encounterId } },
      body: { code },
    },
  )
  console.log(`  Approved: ${code}`)
}

// Reject an incorrect suggestion
await client.POST(
  '/v1/{workspace_id}/scribe/encounters/{encounter_id}/icd10/reject',
  {
    params: { path: { encounter_id: encounterId } },
    body: {
      code: 'Z87.09',
      reason: 'No relevant allergy history for this patient',
    },
  },
)
console.log('  Rejected: Z87.09')

// Edit the assessment section of the SOAP note
console.log('\nEditing SOAP assessment...')

await client.POST(
  '/v1/{workspace_id}/scribe/encounters/{encounter_id}/soap/edit',
  {
    params: { path: { encounter_id: encounterId } },
    body: {
      section: 'assessment',
      content:
        'Patient presents with acute upper respiratory infection. ' +
        'Symptoms consistent with viral etiology. No signs of bacterial superinfection.',
    },
  },
)
console.log('  Assessment updated')

// Edit the plan
await client.POST(
  '/v1/{workspace_id}/scribe/encounters/{encounter_id}/soap/edit',
  {
    params: { path: { encounter_id: encounterId } },
    body: {
      section: 'plan',
      content:
        '1. Supportive care: rest, fluids, OTC antipyretics\n' +
        '2. Follow up in 7 days if symptoms worsen\n' +
        '3. Return precautions discussed',
    },
  },
)
console.log('  Plan updated')

// Finalize the encounter
console.log('\nFinalizing encounter...')

await client.POST(
  '/v1/{workspace_id}/scribe/encounters/{encounter_id}/finalize',
  {
    params: { path: { encounter_id: encounterId } },
  },
)
console.log('Encounter finalized and ready for EHR sync')

// Check voiceprint status for the clinician (if applicable)
const clinicianEntityId = process.env.AMIGO_CLINICIAN_ENTITY_ID
if (clinicianEntityId) {
  const vpStatus = await client.GET('/v1/{workspace_id}/voiceprints/{entity_id}', {
    params: { path: { entity_id: clinicianEntityId } },
  })
  console.log(`\nVoiceprint status for clinician ${clinicianEntityId}:`)
  console.log(`  Enrolled: ${vpStatus.data.enrolled}`)
  if (vpStatus.data.enrolled_at) {
    console.log(`  Enrolled at: ${vpStatus.data.enrolled_at}`)
  }
}
