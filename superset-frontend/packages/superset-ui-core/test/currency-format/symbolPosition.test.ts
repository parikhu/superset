/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  resolveSymbolPosition,
  formatWithSymbolPosition,
} from '@superset-ui/core';

function setFeatureFlags(flags: Record<string, boolean>) {
  Object.defineProperty(window, 'featureFlags', {
    value: flags,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  setFeatureFlags({});
  jest.restoreAllMocks();
});

test('resolveSymbolPosition honors an explicit position regardless of locale', () => {
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');
});

test('resolveSymbolPosition emits a deprecation warning when legacy fallback is used', () => {
  setFeatureFlags({ CURRENCY_LOCALE_SYMBOL_POSITION: false });
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  resolveSymbolPosition('USD', undefined, 'en-US');
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining('always-suffix default'),
  );
});

test('resolveSymbolPosition returns suffix when flag is off and position is unset (legacy)', () => {
  setFeatureFlags({ CURRENCY_LOCALE_SYMBOL_POSITION: false });
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'suffix',
  );
});

test('resolveSymbolPosition derives the position from the locale when flag is on', () => {
  setFeatureFlags({ CURRENCY_LOCALE_SYMBOL_POSITION: true });
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('GBP', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', undefined, 'en-US')).toEqual('prefix');

  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'de-DE')).toEqual('suffix');
});

test('resolveSymbolPosition returns the same result on repeated calls (cached)', () => {
  setFeatureFlags({ CURRENCY_LOCALE_SYMBOL_POSITION: true });
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
});

test('resolveSymbolPosition falls back to prefix for unknown currencies when flag is on', () => {
  setFeatureFlags({ CURRENCY_LOCALE_SYMBOL_POSITION: true });
  expect(resolveSymbolPosition('INVALID_CODE', undefined, 'en-US')).toEqual(
    'prefix',
  );
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'prefix',
  );
});

test('formatWithSymbolPosition places the symbol according to the position', () => {
  expect(formatWithSymbolPosition('$', '1,000', 'prefix')).toEqual('$ 1,000');
  expect(formatWithSymbolPosition('€', '1,000', 'suffix')).toEqual('1,000 €');
});
