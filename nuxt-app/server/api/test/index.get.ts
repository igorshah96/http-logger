import { defineEventHandler } from '#imports';
import { H3Event } from 'h3';

export default defineEventHandler((event: H3Event) => {
  return {
    test: 123,
  };
});
