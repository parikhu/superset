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

import { logging } from '@apache-superset/core/utils';
import {
  resolveSymbolPosition,
  formatWithSymbolPosition,
} from '@superset-ui/core';

const setLocaleSymbolPositionFlag = (enabled: boolean) => {
  window.featureFlags = { CURRENCY_LOCALE_SYMBOL_POSITION: enabled };
};

beforeEach(() => {
  // Default to the flag off (legacy behavior) and silence the deprecation
  // warning so it does not clutter the test output.
  window.featureFlags = {};
  jest.spyOn(logging, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  window.featureFlags = {};
  jest.restoreAllMocks();
});

test('resolveSymbolPosition honors an explicit position regardless of locale or flag', () => {
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');

  setLocaleSymbolPositionFlag(true);
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');
});

test('resolveSymbolPosition keeps the legacy suffix default when the flag is off', () => {
  // With the flag off an unset position always resolves to a suffix, regardless
  // of the locale, preserving pre-existing chart rendering.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('GBP', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('INVALID_CODE', undefined, 'en-US')).toEqual(
    'suffix',
  );
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'suffix',
  );
});

test('resolveSymbolPosition derives the position from the locale when the flag is on', () => {
  setLocaleSymbolPositionFlag(true);

  // en-US places the symbol before the value for these currencies.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('GBP', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', undefined, 'en-US')).toEqual('prefix');

  // Eurozone locales place the EUR symbol after the value.
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'de-DE')).toEqual('suffix');
});

test('resolveSymbolPosition returns the same result on repeated calls (cached)', () => {
  setLocaleSymbolPositionFlag(true);
  // The second call hits the memoized (locale, currencyCode) entry.
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
});

test('resolveSymbolPosition falls back to prefix for unknown currencies when the flag is on', () => {
  setLocaleSymbolPositionFlag(true);
  expect(resolveSymbolPosition('INVALID_CODE', undefined, 'en-US')).toEqual(
    'prefix',
  );
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'prefix',
  );
});

test('resolveSymbolPosition logs a one-time deprecation warning when the legacy default diverges from the locale', () => {
  // Load fresh module instances so the one-time warning guard starts unset.
  jest.isolateModules(() => {
    const { logging: freshLogging } = jest.requireActual<
      typeof import('@apache-superset/core/utils')
    >('@apache-superset/core/utils');
    const warn = jest
      .spyOn(freshLogging, 'warn')
      .mockImplementation(() => undefined);
    const { resolveSymbolPosition: resolve } = jest.requireActual<
      typeof import('../../src/currency-format/symbolPosition')
    >('../../src/currency-format/symbolPosition');

    window.featureFlags = {};
    // en-US would place USD/GBP as a prefix, so the legacy suffix default is the
    // deprecated path and should warn — but only once across calls.
    expect(resolve('USD', undefined, 'en-US')).toEqual('suffix');
    expect(resolve('GBP', undefined, 'en-US')).toEqual('suffix');

    expect(warn).toHaveBeenCalledTimes(1);
  });
});

test('formatWithSymbolPosition places the symbol according to the position', () => {
  expect(formatWithSymbolPosition('$', '1,000', 'prefix')).toEqual('$ 1,000');
  expect(formatWithSymbolPosition('€', '1,000', 'suffix')).toEqual('1,000 €');
});
