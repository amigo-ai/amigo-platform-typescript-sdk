import { createClient } from '../shared.js'

const client = createClient()

const entityResults = await client.world.listEntities({
  q: 'Jane Doe',
  entity_type: ['patient'],
  limit: 5,
})

console.log('Entity matches:')
console.log(JSON.stringify(entityResults, null, 2))

const firstEntity = entityResults.entities[0]

if (firstEntity) {
  const timeline = await client.world.getTimeline(firstEntity.id, { limit: 10 })
  console.log('Timeline:')
  console.log(JSON.stringify(timeline, null, 2))
}

const semanticMatches = await client.world.search({
  q: 'Jane Doe',
  entity_type: 'patient',
  limit: 5,
})

console.log('Semantic search:')
console.log(JSON.stringify(semanticMatches, null, 2))
