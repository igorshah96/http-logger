import { test, expect } from '@playwright/test'

test('Тестирование ограничения payload 1MB', async ({ page }) => {
  console.log('=== НАЧАЛО ТЕСТА: ОГРАНИЧЕНИЕ PAYLOAD 1MB ===\n')

  // 1. Тест: payload больше 1MB должен отклоняться
  console.log('Шаг 1: Отправляем payload больше 1MB')
  
  // Создаём большой payload (>1MB)
  const largeBody = 'x'.repeat(1024 * 1024 + 1000) // 1MB + 1000 bytes
  
  const largePayload = {
    method: 'POST',
    url: '/test-large',
    status: 200,
    duration: 100,
    request: {
      headers: { 'content-type': 'application/json' },
      query: {},
      body: { data: largeBody },
      timestamp: Date.now()
    },
    response: {
      headers: {},
      body: { result: 'ok' },
      timestamp: Date.now() + 100
    }
  }

  const response = await page.request.post('http://localhost:4443/api/logs', {
    data: largePayload
  })

  console.log(`Статус ответа: ${response.status()}`)
  const responseBody = await response.json()
  console.log(`Тело ответа: ${JSON.stringify(responseBody)}`)

  // Ожидаем статус 413 Payload Too Large
  expect(response.status()).toBe(413)
  expect(responseBody.error).toBe('Payload too large')

  // 2. Тест: payload меньше 1MB должен приниматься
  console.log('\nШаг 2: Отправляем payload меньше 1MB')
  
  const smallBody = 'x'.repeat(1024 * 100) // 100KB
  
  const smallPayload = {
    method: 'GET',
    url: '/test-small',
    status: 200,
    duration: 50,
    request: {
      headers: {},
      query: { data: smallBody },
      body: null,
      timestamp: Date.now()
    },
    response: {
      headers: {},
      body: { result: 'ok' },
      timestamp: Date.now() + 50
    }
  }

  const smallResponse = await page.request.post('http://localhost:4443/api/logs', {
    data: smallPayload
  })

  console.log(`Статус ответа: ${smallResponse.status()}`)
  const smallResponseBody = await smallResponse.json()
  console.log(`Тело ответа: ${JSON.stringify(smallResponseBody)}`)

  // Ожидаем статус 201 Created
  expect(smallResponse.status()).toBe(201)
  expect(smallResponseBody.status).toBe('ok')
  expect(smallResponseBody.id).toBeDefined()

  // 3. Тест: payload ровно на границе 1MB
  console.log('\nШаг 3: Отправляем payload на границе 1MB')
  
  // Создаём payload примерно на 1MB (немного меньше для надёжности)
  const boundaryBody = 'x'.repeat(1024 * 1024 - 1000) // 1MB - 1000 bytes
  
  const boundaryPayload = {
    method: 'PUT',
    url: '/test-boundary',
    status: 200,
    duration: 75,
    request: {
      headers: {},
      query: {},
      body: { data: boundaryBody },
      timestamp: Date.now()
    },
    response: {
      headers: {},
      body: { result: 'ok' },
      timestamp: Date.now() + 75
    }
  }

  const boundaryResponse = await page.request.post('http://localhost:4443/api/logs', {
    data: boundaryPayload
  })

  console.log(`Статус ответа: ${boundaryResponse.status()}`)
  const boundaryResponseBody = await boundaryResponse.json()
  console.log(`Тело ответа: ${JSON.stringify(boundaryResponseBody)}`)

  //Payload на границе может быть принят или отклонён в зависимости от реализации
  console.log(`Payload на границе 1MB: статус ${boundaryResponse.status()}`)

  console.log('\n=== ИТОГИ ТЕСТА ===')
  console.log(`✓ Payload >1MB отклонён: статус ${response.status()} (ожидался 413)`)
  console.log(`✓ Payload 100KB принят: статус ${smallResponse.status()} (ожидался 201)`)
  console.log(`✓ Payload на границе: статус ${boundaryResponse.status()}`)
})
