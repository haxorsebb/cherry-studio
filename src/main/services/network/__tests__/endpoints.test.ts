import { expect, it } from 'vitest'

import { builtinEndpoints } from '../endpoints'

it('gives System Doctor no vendor host to probe', async () => {
  await expect(builtinEndpoints()).resolves.toEqual([])
})
