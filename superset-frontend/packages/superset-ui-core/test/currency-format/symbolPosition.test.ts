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
  setLegacySymbolPositionDefault,
} from '@superset-ui/core';

afterEach(() => {
  // Disable the legacy shim after each test so it does not leak.
  setLegacySymbolPositionDefault(false);
});

test('resolveSymbolPosition honors an explicit position regardless of locale', () => {
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');
});

test('resolveSymbolPosition derives the position from the locale when unset', () => {
  // en-US places the symbol before the value for these currencies.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('GBP', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', undefined, 'en-US')).toEqual('prefix');

  // Eurozone locales place the EUR symbol after the value.
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'de-DE')).toEqual('suffix');
});

test('resolveSymbolPosition returns the same result on repeated calls (cached)', () => {
  // The second call hits the memoized (locale, currencyCode) entry.
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
});

test('resolveSymbolPosition falls back to prefix for unknown currencies', () => {
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

// This test must run before any other test calls setLegacySymbolPositionDefault(true)
// because the one-time warning flag is a module-level singleton.
test('legacy flag emits a deprecation warning once', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  setLegacySymbolPositionDefault(true);
  expect(warnSpy).toHaveBeenCalledTimes(1);
  expect(warnSpy.mock.calls[0][0]).toContain('DEPRECATION');

  // Second call should not emit again.
  setLegacySymbolPositionDefault(true);
  expect(warnSpy).toHaveBeenCalledTimes(1);

  warnSpy.mockRestore();
});

test('legacy flag ON: unset position resolves to suffix (pre-PR behavior)', () => {
  setLegacySymbolPositionDefault(true);
  // USD in en-US would be prefix under locale-aware behavior, but legacy
  // forces suffix regardless.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('GBP', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'suffix',
  );
});

test('legacy flag ON: explicit position still honored', () => {
  setLegacySymbolPositionDefault(true);
  expect(resolveSymbolPosition('USD', 'prefix', 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', 'suffix', 'fr-FR')).toEqual('suffix');
});

test('legacy flag OFF: locale-derived behavior is unchanged', () => {
  setLegacySymbolPositionDefault(false);
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
});
