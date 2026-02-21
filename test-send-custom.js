/**
 * Скрипт для тестирования отправки CustomLoggerInfo на порт 4444.
 * Запуск: node test-send-custom.js
 */

const payload = {
  userId: 'user_12345',
  traceId: 'trace_abc_789',
  url: 'https://api.example.com/v1/orders/123',
  method: 'DELETE',
  bffPath: '/api/proxy/orders',
  response: {
    statusCode: 500,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
      'x-server-id': 'node-1'
    },
    data: {
      id: 123,
      status: 'shipped',
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    }
  },
  request: {
    params: {
      id: '123'
    },
    data: {
      items: 123123123
    },
    headers: {
      'authorization': 'Bearer token123',
      'accept': 'application/json'
    }
  }
};

async function sendLog() {
  console.log('Отправка тестового лога на http://localhost:4444...');
  
  try {
    const response = await fetch('http://localhost:4444', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Статус ответа:', response.status);
    console.log('Результат:', result);
    
    if (response.ok) {
      console.log('Успех! Теперь проверьте интерфейс http-logger.');
    } else {
      console.log('Произошла ошибка при отправке.');
    }
  } catch (error) {
    console.error('Ошибка соединения с сервером (убедитесь, что http-logger запущен):', error.message);
  }
}

sendLog();
