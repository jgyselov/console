/* Copyright Contributors to the Open Cluster Management project */
import { get } from 'lodash'
import queryString from 'query-string'
import { TFunction } from 'react-i18next'
import { generatePath, NavigateFunction } from 'react-router-dom-v5-compat'
import { NavigationPath } from '../../../NavigationPath'
import { Cluster } from '../../../resources/utils'
import { compareStrings, IAlertContext } from '../../../ui-components'
import { IVMActionModalProps } from '../../Infrastructure/VirtualMachines/modals/VMActionModal'
import {
  getVirtualMachineRowActionExtensions,
  getVirtualMachineRowActions,
  getVMSnapshotActions,
} from '../../Infrastructure/VirtualMachines/utils'
import {
  ClosedDeleteExternalResourceModalProps,
  IDeleteExternalResourceModalProps,
} from '../components/Modals/DeleteExternalResourceModal'
import { ClosedDeleteModalProps, IDeleteModalProps } from '../components/Modals/DeleteResourceModal'
import { SearchResultItemsQuery } from '../search-sdk/search-sdk'
import { GetUrlSearchParam, SearchColumnDefinition } from '../searchDefinitions'

export interface ISearchResult {
  kind: string
  apiversion: string
  name: string
  apigroup?: string
  __type: string
}

export function getRowActions(
  item: any,
  resourceKind: string,
  currentQuery: string,
  relatedResource: boolean,
  allClusters: Cluster[],
  setDeleteResource: React.Dispatch<React.SetStateAction<IDeleteModalProps>>,
  setDeleteExternalResource: React.Dispatch<React.SetStateAction<IDeleteExternalResourceModalProps>>,
  isFineGrainedRbacEnabled: boolean,
  vmActionsEnabled: boolean,
  setVMAction: React.Dispatch<React.SetStateAction<IVMActionModalProps>>,
  acmExtensions: any,
  setPluginModal: React.Dispatch<React.SetStateAction<JSX.Element | undefined>>,
  navigate: NavigateFunction,
  canMigrateVm: boolean,
  vmMenuVisability: boolean,
  t: TFunction
) {
  const viewApplication = {
    id: 'view-application',
    title: t('View Application'),
    click: (item: any) => {
      const { apigroup, applicationSet, cluster, name, namespace, kind, _hubClusterResource } = item
      if (apigroup === 'app.k8s.io' || apigroup === 'argoproj.io') {
        const path = generatePath(NavigationPath.applicationOverview, {
          namespace,
          name,
        })
        const params = queryString.stringify({
          apiVersion: `${kind}.${apigroup}`.toLowerCase(),
          cluster: !_hubClusterResource ? cluster : undefined,
          applicationset: applicationSet ?? undefined,
        })
        if (item.managedHub === 'global-hub' && !item?._hubClusterResource) {
          const hubUrl = allClusters.find((cluster) => cluster.name === item.cluster)?.consoleURL
          return window.open(`${hubUrl}${path}?${params}`, '_blank')
        }
        return navigate(
          {
            pathname: path,
            search: `?${params}`,
          },
          {
            state: {
              from: NavigationPath.search,
              fromSearch: window.location.search,
            },
          }
        )
      }
      const searchParams = GetUrlSearchParam(item)
      return navigate(
        {
          pathname: NavigationPath.resources,
          search: searchParams,
        },
        {
          state: {
            from: NavigationPath.search,
            fromSearch: window.location.search,
          },
        }
      )
    },
  }
  const viewAppTopology = {
    id: 'view-application-topology',
    title: t('View Application topology'),
    click: (item: any) => {
      const apiversion = encodeURIComponent(`${item?.kind}.${item?.apigroup}`.toLowerCase())
      const path = generatePath(NavigationPath.applicationTopology, { name: item.name, namespace: item.namespace })
      if (item.managedHub && !item?._hubClusterResource) {
        const hubUrl = allClusters.find((cluster) => cluster.name === item.cluster)?.consoleURL
        return window.open(`${hubUrl}${path}?apiVersion=${apiversion}`, '_blank')
      }
      return navigate(
        {
          pathname: path,
          search: `?apiVersion=${apiversion}`,
        },
        {
          state: {
            from: NavigationPath.search,
            fromSearch: window.location.search,
          },
        }
      )
    },
  }
  const editButton = {
    id: 'edit',
    title: t('Edit {{resourceKind}}', { resourceKind }),
    click: (item: any) => {
      const searchParams = GetUrlSearchParam(item)
      if (item.managedHub && item.managedHub !== 'global-hub') {
        // If resource lives on a cluster managed by a managed hub we need to launch user to the managed hub for actions / viewing
        const hubUrl = allClusters.find((cluster) => cluster.name === item.managedHub)?.consoleURL
        return window.open(`${hubUrl}${NavigationPath.resourceYAML}${searchParams}`, '_blank')
      }
      return navigate(
        {
          pathname: NavigationPath.resourceYAML,
          search: searchParams,
        },
        {
          state: {
            from: NavigationPath.search,
            fromSearch: window.location.search,
          },
        }
      )
    },
  }
  const viewRelatedButton = {
    id: 'view-related',
    title: t('View related resources'),
    click: (item: any) => {
      const searchParams = GetUrlSearchParam(item)
      if (item.managedHub && item.managedHub !== 'global-hub') {
        const hubUrl = allClusters.find((cluster) => cluster.name === item.managedHub)?.consoleURL
        return window.open(`${hubUrl}${NavigationPath.resourceRelated}${GetUrlSearchParam(item)}`, '_blank')
      }
      return navigate(
        {
          pathname: NavigationPath.resourceRelated,
          search: searchParams,
        },
        {
          state: {
            from: NavigationPath.search,
            fromSearch: window.location.search,
          },
        }
      )
    },
  }
  const deleteButton = {
    id: 'delete',
    title: t('Delete {{resourceKind}}', { resourceKind }),
    click: (item: any) => {
      if (item.managedHub && item.managedHub !== 'global-hub') {
        setDeleteExternalResource({
          open: true,
          close: () => setDeleteExternalResource(ClosedDeleteExternalResourceModalProps),
          resource: item,
          hubCluster: allClusters.find((cluster) => cluster.name === item.managedHub),
        })
      } else {
        setDeleteResource({
          open: true,
          close: () => setDeleteResource(ClosedDeleteModalProps),
          resource: item,
          currentQuery,
          relatedResource,
        })
      }
    },
  }

  if (
    resourceKind.toLowerCase() === 'cluster' ||
    resourceKind.toLowerCase() === 'release' ||
    resourceKind.toLowerCase() === 'policyreport'
  ) {
    return []
  } else if (resourceKind.toLowerCase() === 'application') {
    return [viewApplication, viewAppTopology, editButton, viewRelatedButton, deleteButton]
  } else if (resourceKind.toLowerCase() === 'virtualmachinesnapshot') {
    const isVMRunning = item?.status === 'Running'
    return getVMSnapshotActions(
      item,
      isVMRunning,
      allClusters,
      vmActionsEnabled,
      isFineGrainedRbacEnabled,
      setDeleteResource,
      setDeleteExternalResource,
      setVMAction,
      navigate,
      t
    )
  } else if (resourceKind.toLowerCase() === 'virtualmachine') {
    return getVirtualMachineRowActions(
      item,
      allClusters,
      setDeleteResource,
      setDeleteExternalResource,
      setVMAction,
      isFineGrainedRbacEnabled,
      vmActionsEnabled,
      navigate,
      t,
      canMigrateVm,
      vmMenuVisability,
      // get the row action extensions for the virtual machine
      getVirtualMachineRowActionExtensions(item, acmExtensions?.virtualMachineAction ?? [], setPluginModal)
    )
  }
  return [editButton, viewRelatedButton, deleteButton]
}

export function generateSearchResultExport(
  exportFileName: string,
  searchResultData: SearchResultItemsQuery | undefined,
  searchDefinitions: any,
  toastContext: IAlertContext,
  t: TFunction<string, undefined>
) {
  toastContext.addAlert({
    title: t('Generating data. Download may take a moment to start.'),
    type: 'info',
    autoClose: true,
  })

  const searchResultItems: ISearchResult[] = searchResultData?.searchResult?.[0]?.items || []
  const kindSearchResultItems: Record<string, ISearchResult[]> = {}
  for (const searchResultItem of searchResultItems) {
    const apiGroup = searchResultItem?.apigroup
    const groupAndKind = apiGroup ? `${searchResultItem.kind}.${apiGroup}` : searchResultItem.kind
    const existing = kindSearchResultItems[groupAndKind]
    if (!existing) {
      kindSearchResultItems[groupAndKind] = [searchResultItem]
    } else {
      kindSearchResultItems[groupAndKind].push(searchResultItem)
    }
  }
  // Sort kinds alphabetically by kind then apigroup if same kind
  const kinds = Object.keys(kindSearchResultItems).sort((a, b) => {
    const strCompareRes = compareStrings(kindSearchResultItems[a][0].kind, kindSearchResultItems[b][0].kind)
    const getApiGroup = (type: string) =>
      kindSearchResultItems[type][0]?.apigroup
        ? `${kindSearchResultItems[type][0]?.apigroup}/${kindSearchResultItems[type][0]?.apiversion}`
        : ''
    return strCompareRes !== 0 ? strCompareRes : compareStrings(getApiGroup(a), getApiGroup(b))
  })

  // Sort resources alphabetically by name
  kinds.forEach((kind: string) => {
    kindSearchResultItems[kind] = kindSearchResultItems[kind].sort((a, b) => {
      return compareStrings(a.name, b.name)
    })
  })

  const defaulColumns = ['name', 'namespace', 'kind', 'cluster', 'created', 'label']
  let columns: SearchColumnDefinition[] = defaulColumns.map((defaultCol: string) => {
    return {
      header: defaultCol,
      sort: defaultCol,
      cell: defaultCol,
    }
  })

  // If only 1 resource kind -> use column headers from searchDefinitions
  if (kinds.length === 1) {
    const kindAndGroup =
      kinds[0].split('.')[0].toLowerCase() === 'subscription'
        ? `subscription.${searchResultItems[0].apigroup}`
        : kinds[0].split('.')[0].toLowerCase()
    columns = get(searchDefinitions, `['${kindAndGroup}'].columns`, searchDefinitions['genericresource'].columns)
    // Filter column definitions that do NOT contain sort field. Sort is the only way to confidently get resource fields
    columns = columns.filter((col: SearchColumnDefinition) => {
      return !!col.sort
    })
  }

  // Variable to store the final csv data
  const csv_data: string[] = [`${columns.map((col) => col.sort).join(',')}`]
  kinds.forEach((kind: string) => {
    kindSearchResultItems[kind].forEach((item: any) => {
      const csv_row: string[] = []
      columns.forEach((column: SearchColumnDefinition) => {
        csv_row.push(item[column.sort!] ?? '-') // Columns without a sort are filtered above
      })
      // Combine each column value with comma
      csv_data.push(csv_row.join(','))
    })
  })
  // Combine each row data with new line character
  const csv_string = csv_data.join('\n')

  // Create download
  const CSVFile = new Blob([csv_string], { type: 'text/csv' })
  const temp_link = document.createElement('a')
  temp_link.download = exportFileName
  const url = window.URL.createObjectURL(CSVFile)
  temp_link.href = url
  // This link should not be displayed
  temp_link.style.display = 'none'
  document.body.appendChild(temp_link)
  // Automatically click the link to trigger download
  temp_link.click()
  document.body.removeChild(temp_link)

  toastContext.addAlert({
    title: t('Export successful'),
    type: 'success',
    autoClose: true,
  })
}
