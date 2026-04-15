/**
 * Example: World model — entity and event management
 * Track real-world entities (patients, contacts) and emit events.
 */

import { AmigoClient, paginate } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env['AMIGO_API_KEY']!,
  workspaceId: process.env['AMIGO_WORKSPACE_ID']!,
})

async function main() {
  // Create a patient entity
  const patient = await client.world.createEntity({
    entity_type: 'patient',
    canonical_id: 'MRN-98765',
    properties: {
      name: 'Jane Doe',
      dob: '1980-06-15',
      phone: '+15555550123',
    },
    confidence: 1.0,
  })
  console.log('Created patient entity:', patient.id)

  // Emit a call-completed event for this patient
  const event = await client.world.emitEvent({
    entity_id: patient.id,
    event_type: 'call_completed',
    data: {
      call_sid: 'CA1234567890',
      duration_seconds: 180,
      outcome: 'appointment_scheduled',
    },
    confidence: 1.0,
  })
  console.log('Emitted event:', event.id)

  // Get the entity's event timeline
  const timeline = await client.world.getTimeline(patient.id)
  console.log(`Patient has ${timeline.length} timeline event(s)`)
  for (const entry of timeline) {
    console.log(` - ${entry.event.event_type} at ${entry.event.created_at}`)
  }

  // Find similar entities (deduplication / merge candidates)
  const similar = await client.world.getSimilar(patient.id, 5)
  console.log(`Found ${similar.entities.length} similar entity/entities`)

  // Paginate through all patient entities
  let count = 0
  for await (const entity of paginate((token) =>
    client.world.listEntities({ entity_type: 'patient', continuation_token: token, limit: 50 }),
  )) {
    count++
    void entity // process entity
  }
  console.log(`Total patient entities: ${count}`)
}

main().catch(console.error)
