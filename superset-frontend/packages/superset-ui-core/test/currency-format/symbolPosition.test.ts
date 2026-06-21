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
  FeatureFlag,
  resolveSymbolPosition,
  formatWithSymbolPosition,
} from '@superset-ui/core';

beforeEach(() => {
  // Locale-derived resolution is gated behind the feature flag; default the
  // suite to the flag-on behavior and override per-test where needed.
  window.featureFlags = {
    [FeatureFlag.CurrencyLocaleSymbolPosition]: true,
  };
});

test('resolveSymbolPosition honors an explicit position regardless of locale', () => {
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');
});

test('resolveSymbolPosition returns the legacy suffix default when the flag is off', () => {
  window.featureFlags = {
    [FeatureFlag.CurrencyLocaleSymbolPosition]: false,
  };
  // With the flag off, an unset position falls back to the legacy suffix
  // regardless of locale convention or currency.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'suffix',
  );
  // An explicit position is still honored even when the flag is off.
  expect(resolveSymbolPosition('USD', 'prefix', 'en-US')).toEqual('prefix');
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

test('resolveSymbolPosition warns at most once when falling back to the legacy suffix', async () => {
  window.featureFlags = {
    [FeatureFlag.CurrencyLocaleSymbolPosition]: false,
  };
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    // Load a fresh module copy so the once-per-session guard starts unset
    // regardless of any earlier fallback in this file.
    await jest.isolateModulesAsync(async () => {
      const { resolveSymbolPosition: freshResolve } =
        await import('../../src/currency-format/symbolPosition');
      freshResolve('USD', undefined, 'en-US');
      freshResolve('EUR', undefined, 'fr-FR');
    });
    // The warning is emitted once per session, not per call.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/CURRENCY_LOCALE_SYMBOL_POSITION/);
  } finally {
    warn.mockRestore();
  }
});

test('formatWithSymbolPosition places the symbol according to the position', () => {
  expect(formatWithSymbolPosition('$', '1,000', 'prefix')).toEqual('$ 1,000');
  expect(formatWithSymbolPosition('€', '1,000', 'suffix')).toEqual('1,000 €');
});
