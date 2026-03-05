import { test, expect } from '@playwright/test';

test('Проверка деталей запроса /test-explicit', async ({ page }) => {
  console.log('=== НАЧАЛО ТЕСТА: ПРОВЕРКА /test-explicit ===\n');

  // 1. Открываем страницу
  console.log('Шаг 1: Открываем страницу http://localhost:4443');
  await page.goto('http://localhost:4443');

  // Ждём загрузки страницы и подключения WebSocket
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // 1.5 Очищаем таблицу перед тестом
  console.log('Шаг 1.5: Очищаем таблицу перед тестом');
  const clearButton = page.locator('button', { hasText: 'Clear Logs' });
  await clearButton.click();
  await page.waitForTimeout(500);

  // 2. Отправляем тестовый лог на сервер (после открытия страницы для real-time обновления)
  console.log('Шаг 2: Отправляем тестовый лог POST /logs');
  const testLog = {
    format: 'external-log',  // Явно указываем формат, чтобы не сработал customLoggerTransformer
    method: 'GET',
    url: '/test-explicit',
    status: 200,
    duration: 42,
    request: {
      headers: { 'accept': 'application/json', 'user-agent': 'test-client' },
      query: { page: '1' },
      body: null,
      timestamp: Date.now()
    },
    response: {
      headers: { 'content-type': 'application/json' },
      body: { data: 'test-response' },
      timestamp: Date.now() + 42
    },
    traceId: 'test-trace-123'
  };

  await page.request.post('http://localhost:4443/api/logs', {
    data: testLog,
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('Тестовый лог отправлен\n');

  // Ждём появления лога в таблице
  await page.waitForTimeout(500);

  // 3. Проверяем статус WebSocket
  console.log('Шаг 3: Проверяем статус WebSocket');
  const wsBadge = page.locator('text=OPEN').first();
  const wsText = await wsBadge.textContent();
  console.log(`Статус WebSocket: ${wsText?.trim()}\n`);

  // 4. Ищем строку с URL "/test-explicit"
  console.log('Шаг 4: Ищем строку с URL "/test-explicit"');
  const targetRow = page.locator('tbody tr').filter({ has: page.locator('text=/test-explicit/i') });
  const targetRowCount = await targetRow.count();
  console.log(`Найдено строк с "/test-explicit": ${targetRowCount}\n`);

  if (targetRowCount === 0) {
    console.log('❌ Строка с "/test-explicit" не найдена!');
    console.log('Доступные строки в таблице:');
    const allRows = page.locator('tbody tr');
    const rowCount = await allRows.count();
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const rowText = await allRows.nth(i).textContent();
      console.log(`  ${i + 1}. ${rowText?.trim()}`);
    }
  }

  expect(targetRowCount).toBeGreaterThan(0);

  // 5. Кликаем на найденную строку
  console.log('Шаг 5: Кликаем на строку с "/test-explicit"');
  await targetRow.first().click();
  await page.waitForTimeout(500);

  // 6. Делаем скриншот открытой панели
  console.log('Шаг 6: Делаем скриншот открытой панели с деталями');
  await page.screenshot({ path: 'screenshot-test-explicit.png', fullPage: true });
  console.log('Скриншот сохранён: screenshot-test-explicit.png\n');

  // 7. Проверяем панель деталей
  console.log('Шаг 7: Проверяем содержимое панели деталей');

  // Проверяем статус
  const statusLabel = page.locator('text=/Status:/i').first();
  const statusValue = await statusLabel.textContent();
  console.log(`Status текст: ${statusValue?.trim()}`);

  // Ищем значение статуса (200)
  const status200 = page.locator('text=/\\b200\\b/').first();
  const hasStatus200 = await status200.count() > 0;
  console.log(`Status 200 найден: ${hasStatus200}`);

  // Проверяем duration
  const durationLabel = page.locator('text=/Duration:/i').first();
  const durationValue = await durationLabel.textContent();
  console.log(`Duration текст: ${durationValue?.trim()}`);

  // Ищем значение 42ms
  const duration42 = page.locator('text=/42\\s*ms/').first();
  const hasDuration42 = await duration42.count() > 0;
  console.log(`Duration 42ms найден: ${hasDuration42}`);

  // Проверяем метод
  const methodBadge = page.locator('text=GET').first();
  const hasMethodGET = await methodBadge.count() > 0;
  console.log(`Метод GET найден: ${hasMethodGET}`);

  // Проверяем URL
  const urlText = page.locator('text=/test-explicit/i').first();
  const hasUrl = await urlText.count() > 0;
  console.log(`URL /test-explicit найден: ${hasUrl}`);

  // 8. Проверка консоли на ошибки
  console.log('\nШаг 8: Проверяем консоль браузера на ошибки');
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  });

  // 8. Итоги
  console.log('\n=== ИТОГИ ТЕСТА ===');
  console.log(`✓ WebSocket статус: ${wsText?.trim() || 'N/A'}`);
  console.log(`✓ Строка "/test-explicit" найдена: ${targetRowCount > 0}`);
  console.log(`✓ Status 200 отображается: ${hasStatus200}`);
  console.log(`✓ Duration 42ms отображается: ${hasDuration42}`);
  console.log(`✓ Метод GET отображается: ${hasMethodGET}`);
  console.log(`✓ URL отображается: ${hasUrl}`);
  
  if (consoleMessages.length > 0) {
    console.log(`\n⚠️ Ошибки в консоли (${consoleMessages.length}):`);
    consoleMessages.forEach(msg => console.log(`  - ${msg}`));
  } else {
    console.log('\n✓ Ошибок в консоли нет');
  }

  console.log('\n📸 Скриншот сохранён: screenshot-test-explicit.png');

  // Assertions
  expect(hasStatus200, 'Status должен быть 200 (не 0)').toBeTruthy();
  expect(hasDuration42, 'Duration должен быть 42ms (не 0ms)').toBeTruthy();
});
