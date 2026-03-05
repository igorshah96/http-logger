import { test, expect } from '@playwright/test'

test('Тестирование очистки логов', async ({ page }) => {
  console.log('=== НАЧАЛО ТЕСТА: ОЧИСТКА ЛОГОВ ===\n')

  // 1. Открываем страницу
  console.log('Шаг 1: Открываем страницу http://localhost:4443')
  await page.goto('http://localhost:4443')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // 2. Очищаем таблицу перед тестом
  console.log('Шаг 2: Очищаем таблицу перед тестом')
  const clearButton = page.locator('button', { hasText: 'Clear Logs' })
  await clearButton.click()
  await page.waitForTimeout(500)

  // Проверяем, что таблица пуста
  let tableRows = page.locator('tbody tr')
  const emptyCount = await tableRows.count()
  console.log(`Количество строк после очистки: ${emptyCount}`)

  // 3. Проверяем начальное состояние таблицы
  console.log('\nШаг 3: Проверяем наличие данных в таблице')
  tableRows = page.locator('tbody tr')
  let initialCount = await tableRows.count()
  console.log(`Начальное количество строк: ${initialCount}`)

  // 3. Отправляем несколько тестовых логов
  console.log('\nШаг 3: Отправляем 3 тестовых лога')
  const testLogs = [
    {
      method: 'GET',
      url: '/test-clear-1',
      status: 200,
      duration: 10,
      request: { headers: {}, query: {}, body: null, timestamp: Date.now() },
      response: { headers: {}, body: { data: 'test-1' }, timestamp: Date.now() + 10 }
    },
    {
      method: 'POST',
      url: '/test-clear-2',
      status: 201,
      duration: 25,
      request: { headers: {}, query: {}, body: { test: 'data' }, timestamp: Date.now() },
      response: { headers: {}, body: { id: 1 }, timestamp: Date.now() + 25 }
    },
    {
      method: 'DELETE',
      url: '/test-clear-3',
      status: 204,
      duration: 15,
      request: { headers: {}, query: {}, body: null, timestamp: Date.now() },
      response: { headers: {}, body: null, timestamp: Date.now() + 15 }
    }
  ]

  for (const log of testLogs) {
    await page.request.post('http://localhost:4443/api/logs', { data: log })
  }
  console.log('3 тестовых лога отправлены\n')

  // Ждём появления логов в таблице
  await page.waitForTimeout(500)

  // 4. Проверяем, что логи появились
  console.log('Шаг 4: Проверяем, что логи появились в таблице')
  tableRows = page.locator('tbody tr')
  const countAfterLogs = await tableRows.count()
  console.log(`Количество строк после добавления: ${countAfterLogs}`)
  expect(countAfterLogs).toBeGreaterThan(initialCount)

  // 5. Проверяем, что новые строки содержат наши тестовые URL
  console.log('\nШаг 5: Проверяем наличие тестовых URL в таблице')
  const testUrl1 = page.locator('text=/test-clear-1/i')
  const testUrl2 = page.locator('text=/test-clear-2/i')
  const testUrl3 = page.locator('text=/test-clear-3/i')
  
  const hasUrl1 = await testUrl1.count() > 0
  const hasUrl2 = await testUrl2.count() > 0
  const hasUrl3 = await testUrl3.count() > 0
  
  console.log(`/test-clear-1 найден: ${hasUrl1}`)
  console.log(`/test-clear-2 найден: ${hasUrl2}`)
  console.log(`/test-clear-3 найден: ${hasUrl3}`)

  expect(hasUrl1).toBeTruthy()
  expect(hasUrl2).toBeTruthy()
  expect(hasUrl3).toBeTruthy()

  // 6. Нажимаем кнопку "Clear Logs"
  console.log('\nШаг 6: Нажимаем кнопку "Clear Logs"')
  await clearButton.click()
  await page.waitForTimeout(500)

  // 7. Проверяем, что таблица очистилась
  console.log('Шаг 7: Проверяем, что таблица очистилась')
  tableRows = page.locator('tbody tr')
  const countAfterClear = await tableRows.count()
  console.log(`Количество строк после очистки: ${countAfterClear}`)

  // Проверяем, что таблица пуста или содержит "No data"
  const hasNoData = await page.locator('text=No data').count() > 0
  const isEmpty = countAfterClear === 0 || hasNoData
  console.log(`Таблица пуста: ${isEmpty}`)
  expect(isEmpty).toBeTruthy()

  // 8. Проверяем, что тестовые URL больше не отображаются
  console.log('\nШаг 8: Проверяем, что тестовые URL больше не отображаются')
  const url1AfterClear = await testUrl1.count()
  const url2AfterClear = await testUrl2.count()
  const url3AfterClear = await testUrl3.count()
  
  console.log(`/test-clear-1 после очистки: ${url1AfterClear}`)
  console.log(`/test-clear-2 после очистки: ${url2AfterClear}`)
  console.log(`/test-clear-3 после очистки: ${url3AfterClear}`)

  expect(url1AfterClear).toBe(0)
  expect(url2AfterClear).toBe(0)
  expect(url3AfterClear).toBe(0)

  // 9. Проверяем статус WebSocket (должен оставаться OPEN)
  console.log('\nШаг 9: Проверяем статус WebSocket после очистки')
  const wsBadge = page.locator('text=OPEN').first()
  const wsStatus = await wsBadge.textContent()
  console.log(`Статус WebSocket: ${wsStatus?.trim()}`)
  expect(wsStatus?.trim()).toBe('OPEN')

  console.log('\n=== ИТОГИ ТЕСТА ===')
  console.log(`✓ Начальное количество строк: ${initialCount}`)
  console.log(`✓ После добавления: ${countAfterLogs}`)
  console.log(`✓ После очистки: ${countAfterClear}`)
  console.log(`✓ Все тестовые URL найдены: ${hasUrl1 && hasUrl2 && hasUrl3}`)
  console.log(`✓ Таблица очищена: ${countAfterClear === 0}`)
  console.log(`✓ WebSocket соединение активно: ${wsStatus?.trim() === 'OPEN'}`)
})
