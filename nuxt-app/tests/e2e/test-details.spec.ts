import { test, expect } from '@playwright/test'

test('Тестирование детализации запроса', async ({ page }) => {
  console.log('=== НАЧАЛО ТЕСТА ===\n')

  // 1. Открываем страницу
  console.log('Шаг 1: Открываем страницу http://localhost:4443')
  await page.goto('http://localhost:4443')

  // Ждём загрузки страницы и подключения WebSocket
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // 2. Проверяем статус WebSocket (ищем badge рядом с заголовком)
  console.log('Шаг 2: Проверяем статус WebSocket')
  const wsBadge = page.locator('text=OPEN').first()
  const wsText = await wsBadge.textContent()
  console.log(`Статус WebSocket: ${wsText?.trim()}`)

  // 3. Проверяем наличие данных в таблице
  console.log('Шаг 3: Проверяем наличие данных в таблице')
  let tableRows = page.locator('tbody tr')
  let rowCount = await tableRows.count()
  console.log(`Количество строк в таблице: ${rowCount}`)

  // Если таблица пуста, отправляем тестовый лог
  if (rowCount === 0 || (rowCount === 1 && await page.locator('text=No data').count() > 0)) {
    console.log('Таблица пуста, отправляем тестовый лог')
    await page.request.post('http://localhost:4443/api/logs', {
      data: {
        method: 'GET',
        url: '/test-details',
        status: 200,
        duration: 50,
        request: { headers: {}, query: {}, body: null, timestamp: Date.now() },
        response: { headers: {}, body: { data: 'test' }, timestamp: Date.now() + 50 }
      }
    })
    await page.waitForTimeout(500)
    tableRows = page.locator('tbody tr')
    rowCount = await tableRows.count()
    console.log(`Количество строк после добавления: ${rowCount}`)
  }

  expect(rowCount).toBeGreaterThan(0)

  // 4. Кликаем на первую строку таблицы (GET запрос)
  console.log('\nШаг 4: Кликаем на первую строку таблицы')
  const firstRow = page.locator('tbody tr').first()
  await firstRow.click()
  await page.waitForTimeout(500)

  // 5. Делаем скриншот открытой панели
  console.log('Шаг 5: Делаем скриншот открытой панели с деталями')
  await page.screenshot({ path: 'screenshot-panel-open.png', fullPage: true })

  // 6. Проверяем, что панель открыта
  console.log('Шаг 6: Проверяем, что панель открыта')

  // Ищем заголовок панели или текст "Request Details"
  const panelHeader = page.locator('text=Request Details').first()
  const hasPanelHeader = (await panelHeader.count()) > 0
  console.log(`Заголовок "Request Details" найден: ${hasPanelHeader}`)

  // Проверяем, что виден метод (badge с GET/POST/PUT/DELETE)
  const methodBadge = page.locator('[class*="uppercase"]').filter({ hasText: /^(GET|POST|PUT|PATCH|DELETE)$/ }).first()
  const hasMethod = (await methodBadge.count()) > 0
  console.log(`Метод (badge) виден: ${hasMethod}`)

  // Проверяем URL
  const urlText = page.locator('text=/\\/api\\//i').first()
  const hasUrl = (await urlText.count()) > 0
  console.log(`URL виден: ${hasUrl}`)

  // Проверяем статус
  const statusText = page.locator('text=/Status:/i').first()
  const hasStatus = (await statusText.count()) > 0
  console.log(`Статус виден: ${hasStatus}`)

  // Проверяем duration
  const durationText = page.locator('text=/Duration:/i').first()
  const hasDuration = (await durationText.count()) > 0
  console.log(`Duration виден: ${hasDuration}`)

  // Проверяем traceId
  const traceIdText = page.locator('text=/TID:/i, text=/TraceId/i').first()
  const hasTraceId = (await traceIdText.count()) > 0
  console.log(`TraceId виден: ${hasTraceId}`)

  // 7. Проверяем вкладки (Headers, Body, Response)
  console.log('\nШаг 7: Проверяем вкладки')
  const headersTab = page.locator('text=Headers').first()
  const bodyTab = page.locator('text=Body').first()
  const responseTab = page.locator('text=Response').first()

  const hasHeadersTab = (await headersTab.count()) > 0
  const hasBodyTab = (await bodyTab.count()) > 0
  const hasResponseTab = (await responseTab.count()) > 0

  console.log(`Вкладка Headers: ${hasHeadersTab}`)
  console.log(`Вкладка Body: ${hasBodyTab}`)
  console.log(`Вкладка Response: ${hasResponseTab}`)

  // 8. Кликаем на вкладку Headers и проверяем содержимое
  console.log('\nШаг 8: Проверяем вкладку Headers')
  if (hasHeadersTab) {
    await headersTab.click()
    await page.waitForTimeout(300)

    // Ищем текст headers в JSON формате
    const jsonContent = page.locator('pre').first()
    const hasJson = (await jsonContent.count()) > 0
    console.log(`JSON контент виден: ${hasJson}`)
  }

  // 9. Кликаем на вкладку Body и проверяем
  console.log('\nШаг 9: Проверяем вкладку Body')
  if (hasBodyTab) {
    await bodyTab.click()
    await page.waitForTimeout(300)
  }

  // 10. Кликаем на вкладку Response и проверяем
  console.log('\nШаг 10: Проверяем вкладку Response')
  if (hasResponseTab) {
    await responseTab.click()
    await page.waitForTimeout(300)
  }

  // 11. Закрываем панель
  console.log('\nШаг 11: Закрываем панель')

  // Ищем кнопку закрытия (крестик)
  const closeButton = page.locator('button[aria-label="Close"]').first()
  if ((await closeButton.count()) > 0) {
    await closeButton.click()
    console.log('Кнопка закрытия найдена и нажата')
  } else {
    // Клик вне панели (слева)
    await page.mouse.click(50, 100)
    console.log('Клик вне панели')
  }
  await page.waitForTimeout(500)

  // 12. Проверяем, что панель закрылась
  console.log('Шаг 12: Проверяем, что панель закрылась')
  const panelStillVisible = (await panelHeader.count()) > 0
  const isPanelClosed = !panelStillVisible
  console.log(`Панель закрыта: ${isPanelClosed}`)

  // Финальный скриншот
  await page.screenshot({ path: 'screenshot-panel-closed.png', fullPage: true })

  console.log('\n=== ИТОГИ ТЕСТА ===')
  console.log(`✓ WebSocket статус: ${wsText?.trim() || 'N/A'}`)
  console.log(`✓ Строк в таблице: ${rowCount}`)
  console.log(`✓ Панель открылась: ${hasPanelHeader}`)
  console.log(`✓ Метод виден: ${hasMethod}`)
  console.log(`✓ URL виден: ${hasUrl}`)
  console.log(`✓ Статус виден: ${hasStatus}`)
  console.log(`✓ Duration виден: ${hasDuration}`)
  console.log(`✓ TraceId виден: ${hasTraceId}`)
  console.log(`✓ Вкладки: Headers=${hasHeadersTab}, Body=${hasBodyTab}, Response=${hasResponseTab}`)
  console.log(`✓ Панель закрылась: ${isPanelClosed}`)

  console.log('\nСкриншоты сохранены:')
  console.log('  - screenshot-panel-open.png (открытая панель)')
  console.log('  - screenshot-panel-closed.png (закрытая панель)')

  // Assertions
  expect(rowCount).toBeGreaterThan(0)
  expect(hasPanelHeader || hasMethod).toBeTruthy()
})
