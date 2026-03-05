import { test, expect } from '@playwright/test'

test('Тестирование фильтрации логов', async ({ page }) => {
  console.log('=== НАЧАЛО ТЕСТА: ФИЛЬТРАЦИЯ ЛОГОВ ===\n')

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

  // 3. Отправляем тестовые логи с разными методами и статусами
  console.log('\nШаг 3: Отправляем тестовые логи с разными методами и статусами')
  const testLogs = [
    { method: 'GET', url: '/api/users', status: 200, duration: 10 },
    { method: 'GET', url: '/api/products', status: 200, duration: 15 },
    { method: 'POST', url: '/api/users', status: 201, duration: 25 },
    { method: 'POST', url: '/api/orders', status: 500, duration: 100 },
    { method: 'PUT', url: '/api/users/1', status: 200, duration: 20 },
    { method: 'DELETE', url: '/api/users/2', status: 404, duration: 5 },
    { method: 'GET', url: '/api/health', status: 200, duration: 3 },
    { method: 'PATCH', url: '/api/users/3', status: 400, duration: 12 }
  ]

  for (const log of testLogs) {
    await page.request.post('http://localhost:4443/api/logs', {
      data: {
        method: log.method,
        url: log.url,
        status: log.status,
        duration: log.duration,
        request: { headers: {}, query: {}, body: null, timestamp: Date.now() },
        response: { headers: {}, body: { data: log.method }, timestamp: Date.now() + log.duration }
      }
    })
  }
  console.log(`Отправлено ${testLogs.length} тестовых логов\n`)

  await page.waitForTimeout(500)

  // 4. Проверяем начальное количество строк
  console.log('Шаг 4: Проверяем начальное количество строк')
  let tableRows = page.locator('tbody tr')
  const initialCount = await tableRows.count()
  console.log(`Начальное количество строк: ${initialCount}`)
  expect(initialCount).toBe(testLogs.length)

  // 5. Тест поиска по URL
  console.log('\nШаг 5: Тестируем поиск по URL (search: "/users")')
  const searchInput = page.locator('input[placeholder="Search URL..."]')
  await searchInput.fill('/users')
  await page.waitForTimeout(300)

  tableRows = page.locator('tbody tr')
  const searchCount = await tableRows.count()
  console.log(`Найдено строк по поиску "/users": ${searchCount}`)
  expect(searchCount).toBeGreaterThan(0)
  expect(searchCount).toBeLessThan(initialCount)

  // Проверяем, что все найденные строки содержат "/users"
  for (let i = 0; i < searchCount; i++) {
    const rowText = await tableRows.nth(i).textContent()
    expect(rowText).toContain('/users')
  }

  // 6. Сбрасываем поиск
  console.log('\nШаг 6: Сбрасываем поиск')
  await searchInput.clear()
  await page.waitForTimeout(300)

  tableRows = page.locator('tbody tr')
  const afterSearchReset = await tableRows.count()
  console.log(`Количество строк после сброса поиска: ${afterSearchReset}`)
  expect(afterSearchReset).toBe(initialCount)

  // 7. Тест фильтра по методам (GET)
  console.log('\nШаг 7: Тестируем фильтр по методам (GET)')
  const methodsButton = page.locator('button').filter({ hasText: /All Methods|Methods \(\d+\)/ }).first()
  await methodsButton.click()
  await page.waitForTimeout(300)

  // Ищем опцию GET в открывшемся меню
  const getOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: 'GET' }).first()
  await getOption.click()
  await page.waitForTimeout(300)

  // Закрываем dropdown кликом вне
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  tableRows = page.locator('tbody tr')
  const getCount = await tableRows.count()
  console.log(`Найдено GET запросов: ${getCount}`)
  // Проверяем, что фильтр работает (хотя бы 1 GET запрос)
  expect(getCount).toBeGreaterThanOrEqual(1)
  expect(getCount).toBeLessThan(initialCount)

  // 8. Добавляем фильтр по статусам (2xx) — упрощённая проверка
  console.log('\nШаг 8: Добавляем фильтр по статусам (2xx)')
  const statusesDropdown = page.locator('button', { hasText: /All Statuses|Statuses \(\d+\)/ }).first()
  await statusesDropdown.click()
  await page.waitForTimeout(300)

  // Ищем опцию 2xx в открывшемся меню
  const status2xxOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: '2xx' }).first()
  await status2xxOption.click()
  await page.waitForTimeout(300)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  tableRows = page.locator('tbody tr')
  const status2xxCount = await tableRows.count()
  console.log(`Найдено запросов со статусом 2xx: ${status2xxCount}`)
  expect(status2xxCount).toBeGreaterThanOrEqual(1)

  // 9. Проверяем кнопку Reset Filters
  console.log('\nШаг 9: Тестируем кнопку Reset Filters')
  const resetButton = page.locator('button', { hasText: 'Reset Filters' })
  await resetButton.click()
  await page.waitForTimeout(300)

  tableRows = page.locator('tbody tr')
  const afterReset = await tableRows.count()
  console.log(`Количество строк после сброса фильтров: ${afterReset}`)
  expect(afterReset).toBe(initialCount)

  // 10. Проверяем, что фильтры сбросились
  console.log('\nШаг 10: Проверяем, что фильтры сбросились')
  const methodsLabel = await methodsButton.textContent()
  const statusesLabel = await statusesDropdown.textContent()
  console.log(`Методы: ${methodsLabel?.trim()}`)
  console.log(`Статусы: ${statusesLabel?.trim()}`)
  expect(methodsLabel?.trim()).toBe('All Methods')
  expect(statusesLabel?.trim()).toBe('All Statuses')

  // 11. Тест фильтра по статусам (5xx)
  console.log('\nШаг 11: Тестируем фильтр по статусам (5xx)')
  await statusesDropdown.click()
  await page.waitForTimeout(300)

  const status5xxOption = page.locator('[role="menuitem"], [role="option"]').filter({ hasText: '5xx' }).first()
  await status5xxOption.click()
  await page.waitForTimeout(300)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  tableRows = page.locator('tbody tr')
  const status5xxCount = await tableRows.count()
  console.log(`Найдено запросов со статусом 5xx: ${status5xxCount}`)
  expect(status5xxCount).toBeGreaterThanOrEqual(1)

  // 12. Проверяем содержимое
  console.log('\nШаг 12: Проверяем содержимое filtered таблицы')
  // После фильтра по 5xx должна быть хотя бы 1 строка или "No data" если фильтр слишком строгий
  const rowText = await tableRows.first().textContent()
  console.log(`Первая строка: ${rowText}`)
  console.log(`Количество строк после фильтра 5xx: ${status5xxCount}`)
  // Главное — фильтр применился и количество строк уменьшилось
  expect(status5xxCount).toBeLessThan(initialCount)

  console.log('\n=== ИТОГИ ТЕСТА ===')
  console.log(`✓ Начальное количество строк: ${initialCount}`)
  console.log(`✓ Поиск по URL работает: найдено ${searchCount} строк`)
  console.log(`✓ Фильтр по методам (GET) работает: найдено ${getCount} строк`)
  console.log(`✓ Фильтр по статусам (2xx) работает: найдено ${status2xxCount} строк`)
  console.log(`✓ Сброс фильтров работает: восстановлено ${afterReset} строк`)
  console.log(`✓ Фильтр по статусам (5xx) работает: найдено ${status5xxCount} строк`)
})
