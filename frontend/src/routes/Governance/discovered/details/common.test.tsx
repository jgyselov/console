/* Copyright Contributors to the Open Cluster Management project */
import { render } from '@testing-library/react'
import { DiscoveredPolicyItem } from '../useFetchPolicies'
import {
  convertYesNoCell,
  getTotalViolationsCompliance,
  DiscoveredViolationsCard,
  policyViolationSummary,
} from './common'
import { waitForText } from '../../../../lib/test-util'
import i18next from 'i18next'
import { MemoryRouter } from 'react-router-dom-v5-compat'

describe('ByCluster common component test', () => {
  test('Compliant should be 2 and others should be 0', async () => {
    const mockData: DiscoveredPolicyItem[] = [
      {
        _hubClusterResource: true,
        _uid: 'local-cluster/36044810-6b61-4437-adbe-5456c5f47a95',
        apigroup: 'policy.open-cluster-management.io',
        apiversion: 'v1',
        cluster: 'local-cluster',
        created: '2024-08-15T14:01:52Z',
        kind: 'ConfigurationPolicy',
        kind_plural: 'configurationpolicies',
        label:
          'cluster-name=local-cluster; cluster-namespace=local-cluster; policy.open-cluster-management.io/cluster-name=local-cluster; policy.open-cluster-management.io/cluster-namespace=local-cluster',
        name: 'policy-pod',
        namespace: 'local-cluster',
        compliant: 'Compliant',
        responseAction: 'enforce',
        severity: 'low',
        disabled: false,
        _isExternal: true,
        annotation: 'apps.open-cluster-management.io/hosting-subscription=policies/demo-sub',
      },
      {
        _hubClusterResource: true,
        _uid: 'local-cluster/36044810-6b61-4437-adbe-5456c5f47a95',
        apigroup: 'policy.open-cluster-management.io',
        apiversion: 'v1',
        cluster: 'managed4',
        created: '2024-08-15T14:01:52Z',
        kind: 'ConfigurationPolicy',
        kind_plural: 'configurationpolicies',
        label: 'policy.open-cluster-management.io/policy=default.dd',
        name: 'policy-pod',
        namespace: 'managed4',
        compliant: 'Compliant',
        responseAction: 'inform',
        severity: 'low',
        disabled: false,
        _isExternal: true,
        annotation: 'apps.open-cluster-management.io/hosting-subscription=policies/demo-sub',
      },
    ]

    render(
      <MemoryRouter>
        <DiscoveredViolationsCard
          policyKind="ConfigurationPolicy"
          policyViolationSummary={policyViolationSummary(mockData)}
        />
      </MemoryRouter>
    )

    await waitForText('2 with no violations')
    await waitForText('0 pending')
    await waitForText('0 with violations')
  })

  test('Compliant, NonCompliant, and Pending should each have 1', async () => {
    const mockData: DiscoveredPolicyItem[] = [
      {
        _hubClusterResource: true,
        _uid: 'local-cluster/36044810-6b61-4437-adbe-5456c5f47a95',
        apigroup: 'policy.open-cluster-management.io',
        apiversion: 'v1',
        cluster: 'local-cluster',
        created: '2024-08-15T14:01:52Z',
        kind: 'ConfigurationPolicy',
        kind_plural: 'configurationpolicies',
        label:
          'cluster-name=local-cluster; cluster-namespace=local-cluster; policy.open-cluster-management.io/cluster-name=local-cluster; policy.open-cluster-management.io/cluster-namespace=local-cluster',
        name: 'policy-pod',
        namespace: 'local-cluster',
        compliant: 'Compliant',
        responseAction: 'enforce',
        severity: 'low',
        disabled: false,
        _isExternal: true,
        annotation: 'apps.open-cluster-management.io/hosting-subscription=policies/demo-sub',
      },
      {
        _hubClusterResource: true,
        _uid: 'local-cluster/36044810-6b61-4437-adbe-5456c5f47a95',
        apigroup: 'policy.open-cluster-management.io',
        apiversion: 'v1',
        cluster: 'managed4',
        created: '2024-08-15T14:01:52Z',
        kind: 'ConfigurationPolicy',
        kind_plural: 'configurationpolicies',
        label: 'policy.open-cluster-management.io/policy=default.dd',
        name: 'policy-pod',
        namespace: 'managed4',
        compliant: 'NonCompliant',
        responseAction: 'inform',
        severity: 'low',
        disabled: false,
        _isExternal: true,
        annotation: 'apps.open-cluster-management.io/hosting-subscription=policies/demo-sub',
      },
      {
        _hubClusterResource: true,
        _uid: 'local-cluster/36044810-6b61-4437-adbe-5456c5f47a95',
        apigroup: 'policy.open-cluster-management.io',
        apiversion: 'v1',
        cluster: 'managed5',
        created: '2024-08-15T14:01:52Z',
        kind: 'ConfigurationPolicy',
        kind_plural: 'configurationpolicies',
        label: 'policy.open-cluster-management.io/policy=default.dd',
        name: 'policy-pod',
        namespace: 'managed5',
        compliant: 'Pending',
        responseAction: 'inform',
        severity: 'low',
        disabled: false,
        _isExternal: true,
        annotation: 'apps.open-cluster-management.io/hosting-subscription=policies/demo-sub',
      },
    ]

    render(
      <MemoryRouter>
        <DiscoveredViolationsCard
          policyKind="ConfigurationPolicy"
          policyViolationSummary={policyViolationSummary(mockData)}
        />
      </MemoryRouter>
    )

    await waitForText('1 with no violations')
    await waitForText('1 pending')
    await waitForText('1 with violations')
  })

  test('convertYesNoCell should work properly', () => {
    const t = i18next.t.bind(i18next)

    expect(convertYesNoCell('false', t)).toBe('no')
    expect(convertYesNoCell(false, t)).toBe('no')
    expect(convertYesNoCell(true, t)).toBe('yes')
    expect(convertYesNoCell(undefined, t)).toBe('-')
  })
})

describe('getTotalViolationsCompliance', () => {
  test('getTotalViolationsCompliance should work properly', () => {
    expect(getTotalViolationsCompliance(0)).toEqual('compliant')
    expect(getTotalViolationsCompliance(1)).toEqual('noncompliant')
    expect(getTotalViolationsCompliance(undefined)).toEqual('-')
  })
})
