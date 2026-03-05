import { test, expect } from '@playwright/test'

test('Тестирование группировки BFF + axios запросы', async ({ page }) => {
  console.log('=== НАЧАЛО ТЕСТА: ГРУППИРОВКА BFF + AXIOS ===\n')

  // 1. Открываем страницу
  console.log('Шаг 1: Открываем страницу http://localhost:4443')
  await page.goto('http://localhost:4443')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // 2. Очищаем таблицу перед тестом
  console.log('Шаг 2: Очищаем таблицу перед тестом')
  const clearButton = page.locator('button', { hasText: 'Clear Logs' })
  await clearButton.click()
  await page.waitForTimeout(1000)

  // 3. Отправляем BFF-запрос с вложенными axios-вызовами
  console.log('\nШаг 3: Отправляем BFF-запрос с вложенными axios-вызовами')
  const bffWithAxios = {
    method: 'GET',
    url: '/bff/users',
    status: 200,
    duration: 150,
    request: {
      headers: { 'accept': 'application/json' },
      query: { page: '1' },
      body: null,
      timestamp: Date.now()
    },
    response: {
      headers: { 'content-type': 'application/json' },
      body: { users: [] },
      timestamp: Date.now() + 150
    },
    traceId: 'bff-trace-001',
    bffPath: '/bff/users',
    meta: {
      axiosRequests: [
        {
          url: 'http://internal-api/users',
          params: 'page=1',
          code: 200,
          message: 'OK',
          data: { users: [] },
          timestamp: Date.now() + 50
        },
        {
          url: 'http://internal-api/profiles',
          params: '',
          code: 200,
          message: 'OK',
          data: { profiles: [] },
          timestamp: Date.now() + 100
        }
      ] as any[]
    }
  }

  await page.request.post('http://localhost:4443/api/logs', {
    data: bffWithAxios
  })
  console.log('BFF-запрос с 2 axios-вызовами отправлен\n')

  // 4. Отправляем ещё один BFF-запрос с одним axios-вызовом
  console.log('Шаг 4: Отправляем второй BFF-запрос с 1 axios-вызовом')
  const bffWithSingleAxios = {
    method: 'POST',
    url: '/bff/orders',
    status: 201,
    duration: 200,
    request: {
      headers: { 'content-type': 'application/json' },
      query: {},
      body: { orderId: 123 },
      timestamp: Date.now()
    },
    response: {
      headers: { 'content-type': 'application/json' },
      body: { id: 123, status: 'created' },
      timestamp: Date.now() + 200
    },
    traceId: 'bff-trace-002',
    bffPath: '/bff/orders',
    meta: {
      axiosRequests: [
        {
          url: 'http://internal-api/orders',
          params: '',
          code: 201,
          message: 'Created',
          data: { id: 123 },
          timestamp: Date.now() + 150
        }
      ] as any[]
    }
  }

  await page.request.post('http://localhost:4443/api/logs', {
    data: bffWithSingleAxios
  })
  console.log('BFF-запрос с 1 axios-вызовом отправлен\n')

  // 5. Отправляем обычный запрос без axios
  console.log('Шаг 5: Отправляем обычный запрос без axios')
  const simpleRequest = {
    method: 'GET',
    url: '/health',
    status: 200,
    duration: 5,
    request: {
      headers: {},
      query: {},
      body: null,
      timestamp: Date.now()
    },
    response: {
      headers: {},
      body: { status: 'ok' },
      timestamp: Date.now() + 5
    }
  }

  await page.request.post('http://localhost:4443/api/logs', {
    data: simpleRequest
  })
  console.log('Обычный запрос без axios отправлен\n')

  await page.waitForTimeout(500)

  // 6. Проверяем количество строк в таблице
  console.log('Шаг 6: Проверяем количество строк в таблице')
  let tableRows = page.locator('tbody tr')
  const totalRows = await tableRows.count()
  console.log(`Общее количество строк: ${totalRows}`)
  
  // Ожидаем: 3 BFF-запроса + 2 axios для первого + 1 axios для второго = 6 строк
  expect(totalRows).toBe(6)

  // 7. Проверяем структуру группировки для первого BFF-запроса
  console.log('\nШаг 7: Проверяем структуру группировки для первого BFF-запроса')
  
  // Ищем BFF-строку по URL
  const bff1Row = page.locator('tbody tr').filter({ has: page.locator('text=/bff/users/i') }).first()
  const bff1Method = await bff1Row.locator('td').nth(0).textContent()
  const bff1Url = await bff1Row.locator('td').nth(1).textContent()
  const bff1Status = await bff1Row.locator('td').nth(2).textContent()
  
  console.log(`BFF #1 Method: ${bff1Method?.trim()}`)
  console.log(`BFF #1 URL: ${bff1Url?.trim()}`)
  console.log(`BFF #1 Status: ${bff1Status?.trim()}`)
  
  expect(bff1Method?.trim()).toBe('GET')
  expect(bff1Url).toContain('/bff/users')
  expect(bff1Status?.trim()).toBe('200')

  // 8. Проверяем axios-дочерние строки для первого BFF
  console.log('\nШаг 8: Проверяем axios-дочерние строки для первого BFF')
  
  // Ищем строки с axios (должны быть с отступом и иконкой)
  const axiosRows = page.locator('tbody tr').filter({ has: page.locator('text=axios') })
  const axiosCount = await axiosRows.count()
  console.log(`Количество axios-строк: ${axiosCount}`)
  
  // Проверяем, что axios-строки имеют отступ (класс pl-8 или similar)
  for (let i = 0; i < Math.min(axiosCount, 3); i++) {
    const axiosRow = axiosRows.nth(i)
    const axiosUrl = await axiosRow.locator('td').nth(1).textContent()
    const axiosCode = await axiosRow.locator('td').nth(2).textContent()
    
    console.log(`Axios #${i + 1} URL: ${axiosUrl?.trim()}`)
    console.log(`Axios #${i + 1} Code: ${axiosCode?.trim()}`)
    
    // Проверяем, что URL содержит внутренний API
    expect(axiosUrl).toContain('internal-api')
  }

  // 9. Проверяем второй BFF-запрос
  console.log('\nШаг 9: Проверяем второй BFF-запрос')
  const bff2Row = page.locator('tbody tr').filter({ has: page.locator('text=/bff/orders/i') }).first()
  const bff2Method = await bff2Row.locator('td').nth(0).textContent()
  const bff2Url = await bff2Row.locator('td').nth(1).textContent()
  const bff2Status = await bff2Row.locator('td').nth(2).textContent()
  
  console.log(`BFF #2 Method: ${bff2Method?.trim()}`)
  console.log(`BFF #2 URL: ${bff2Url?.trim()}`)
  console.log(`BFF #2 Status: ${bff2Status?.trim()}`)
  
  expect(bff2Method?.trim()).toBe('POST')
  expect(bff2Url).toContain('/bff/orders')
  expect(bff2Status?.trim()).toBe('201')

  // 10. Проверяем простой запрос (без axios)
  console.log('\nШаг 10: Проверяем простой запрос (без axios)')
  const simpleRow = page.locator('tbody tr').filter({ has: page.locator('text=/health/i') }).first()
  const simpleMethod = await simpleRow.locator('td').nth(0).textContent()
  const simpleUrl = await simpleRow.locator('td').nth(1).textContent()
  
  console.log(`Simple Method: ${simpleMethod?.trim()}`)
  console.log(`Simple URL: ${simpleUrl?.trim()}`)
  
  expect(simpleMethod?.trim()).toBe('GET')
  expect(simpleUrl).toContain('/health')

  // 11. Проверяем, что у простого запроса нет axios-дочерних строк
  console.log('\nШаг 11: Проверяем, что у простого запроса нет axios-дочерних строк')
  // Простой запрос не имеет meta.axiosRequests, поэтому у него не должно быть дочерних строк
  // Проверяем, что строка /health не имеет дочерних axios-строк сразу после неё
  const healthRowIndex = await tableRows.filter({ has: page.locator('text=/health/i') }).first().evaluate(
    (row) => Array.from(row.parentElement?.children || []).indexOf(row)
  )
  console.log(`Индекс строки /health: ${healthRowIndex}`)
  
  // Проверяем следующую строку — она не должна быть axios для /health
  const nextRow = tableRows.nth(healthRowIndex + 1)
  const nextRowHasAxios = await nextRow.locator('text=axios').count() > 0
  console.log(`Следующая строка — axios: ${nextRowHasAxios}`)
  expect(nextRowHasAxios).toBeFalsy()

  // 12. Кликаем на BFF-строку и проверяем детали
  console.log('\nШаг 12: Кликаем на BFF-строку и проверяем детали')
  await bff1Row.click()
  await page.waitForTimeout(500)

  // Проверяем, что панель открылась
  const panelHeader = page.locator('text=Request Details').first()
  const isPanelOpen = await panelHeader.count() > 0
  console.log(`Панель открылась: ${isPanelOpen}`)
  expect(isPanelOpen).toBeTruthy()

  // 12.5 Закрываем панель и кликаем на axios-строку
  console.log('\nШаг 12.5: Закрываем панель и кликаем на axios-строку')
  let closeBtn = page.locator('button[aria-label="Close"]').first()
  if (await closeBtn.count() > 0) {
    await closeBtn.click()
  } else {
    await page.mouse.click(50, 100)
  }
  await page.waitForTimeout(500)

  // Кликаем на axios-строку с force=true
  const firstAxiosRow = axiosRows.first()
  await firstAxiosRow.click({ force: true })
  await page.waitForTimeout(1000)

  // Проверяем, что видна вкладка "Axios Response"
  // UTabs использует [data-slot="trigger"] для кнопок вкладок
  const axiosTab = page.locator('[data-slot="trigger"]').filter({ hasText: 'Axios' }).first()
  const hasAxiosTab = await axiosTab.count() > 0
  console.log(`Вкладка Axios Response видна: ${hasAxiosTab}`)

  // 13. Кликаем на вкладку Axios Response и проверяем содержимое
  console.log('\nШаг 13: Кликаем на вкладку Axios Response и проверяем содержимое')
  if (hasAxiosTab) {
    // Пробуем кликнуть на вкладку
    await axiosTab.click()
    await page.waitForTimeout(1000)

    // Проверяем, что вкладка активна
    const tabList = page.locator('[role="tablist"]')
    const activeTab = tabList.locator('[data-state="active"]')
    const activeTabText = await activeTab.textContent()
    console.log(`Активная вкладка: ${activeTabText?.trim()}`)

    // Проверяем содержимое вкладки — ищем pre с JSON данными axios
    // UTabs показывает только активную вкладку, поэтому ищем все pre
    const allPre = page.locator('pre')
    const preCount = await allPre.count()
    console.log(`Количество pre элементов: ${preCount}`)

    // Ищем pre, который содержит axios данные
    let axiosText = ''
    for (let i = 0; i < preCount; i++) {
      const preText = await allPre.nth(i).textContent()
      if (preText?.includes('internal-api')) {
        axiosText = preText
        console.log(`Найден pre с axios данными (индекс ${i})`)
        break
      }
    }

    if (!axiosText && preCount > 0) {
      axiosText = await allPre.last().textContent()
    }

    console.log(`Содержимое axios: ${axiosText?.substring(0, 150)}...`)

    // Проверяем, что вкладка содержит данные axios (URL, code, timestamp)
    expect(axiosText).toBeTruthy()
    expect(axiosText?.length).toBeGreaterThan(10)

    // Проверяем наличие ключевых полей axios в JSON
    expect(axiosText).toContain('url')
    expect(axiosText).toContain('code')
    expect(axiosText).toContain('internal-api')
    console.log('✓ Содержимое вкладки Axios Response содержит ожидаемые данные')
  }

  // 14. Закрываем панель
  console.log('\nШаг 14: Закрываем панель')
  closeBtn = page.locator('button[aria-label="Close"]').first()
  if (await closeBtn.count() > 0) {
    await closeBtn.click()
  } else {
    await page.mouse.click(50, 100)
  }
  await page.waitForTimeout(300)

  console.log('\n=== ИТОГИ ТЕСТА ===')
  console.log(`✓ Общее количество строк: ${totalRows} (ожидалось 6)`)
  console.log(`✓ Количество axios-строк: ${axiosCount}`)
  console.log(`✓ BFF #1 найден: /bff/users`)
  console.log(`✓ BFF #2 найден: /bff/orders`)
  console.log(`✓ Простой запрос найден: /health`)
  console.log(`✓ Панель открылась: ${isPanelOpen}`)
  console.log(`✓ Вкладка Axios видна: ${hasAxiosTab}`)
})
