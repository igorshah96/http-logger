/**
 * Скрипт для тестирования группировки BFF + axiosRequests.
 * Запуск: node test-send-custom-with-axios.js
 *
 * Требуется запущенный http-logger, принимающий POST на http://localhost:4444
 * (формат payload — CustomLoggerInfo).
 */

const payload = {
  userId: 'user_group_1',
  traceId: 'trace_group_axios_1',
  url: 'https://bff.example.com/api/orders/123',
  method: 'GET',
  bffPath: '/bff/orders',

  logDetails: ['BFF request for order details', { feature: 'grouped-table-test', env: 'local' }],

  axiosRequests: [
    {
      url: 'https://backend.example.com/internal/orders/123',
      params: 'include=items,customer',
      code: 200,
      message: 'OK',
      body: {
        correlationId: 'corr-1',
      },
      data: {
        id: 123,
        status: 'SHIPPED',
        items: Array(1000)
          .fill()
          .map((_, index) => ({ label: `label${index}`, value: `value${index}` })),
      },
      timestamp: Date.now() - 1500,
    },
    {
      url: 'https://backend.example.com/internal/notifications',
      params: 'type=email',
      code: 500,
      message: 'ECONNRESET',
      body: {
        template: 'order_shipped',
      },
      data: {
        error: 'Downstream service unavailable',
      },
      timestamp: Date.now() - 500,
    },
  ],

  response: {
    statusCode: 207,
    statusText: 'Multi-Status',
    headers: {
      'content-type': 'application/json',
      'x-bff-node': 'bff-1',
    },
    data: {
      id: 123,
      status: 'PARTIALLY_SHIPPED',
      errors: [{ service: 'notifications', code: 'DOWNSTREAM_UNAVAILABLE' }],
    },
  },

  request: {
    params: {
      id: '123',
      debug: 'true',
    },
    data: {
      include: ['items', 'customer'],
    },
    headers: {
      authorization: 'Bearer bff-token',
      'x-trace-id': 'trace_group_axios_1',
    },
  },
};

async function sendLog() {
  console.log('Отправка тестового лога с axiosRequests на http://localhost:4444...');

  try {
    const response = await fetch('http://localhost:4443/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let result = null;
    try {
      result = await response.json();
    } catch {
      // Приёмник может ничего не возвращать — это не критично для теста.
    }

    console.log('Статус ответа:', response.status);
    if (result != null) {
      console.log('Результат:', result);
    }

    if (response.ok) {
      console.log('Успех! Открой интерфейс http-logger и проверь, что видна одна BFF-строка и две вложенные axios-строки.');
    } else {
      console.log('Произошла ошибка при отправке.');
    }
  } catch (error) {
    console.error('Ошибка соединения с сервером (убедитесь, что http-logger запущен):', error.meszsage);
  }
}

sendLog();
