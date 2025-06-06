/* Copyright Contributors to the Open Cluster Management project */

import _ from 'lodash'
import { AcmTable, AcmEmptyState, AcmTablePaginationContextProvider, AcmButton } from '../../../ui-components'
import { Stack, StackItem, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core'
import { TFunction } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom-v5-compat'
import queryString from 'query-string'
import { ApplicationDefinition, IResource } from '../../../resources'
import { DeleteResourceModal, IDeleteResourceModalProps } from './DeleteResourceModal'
import { NavigationPath } from '../../../NavigationPath'
import { rbacCreate, useIsAnyNamespaceAuthorized } from '../../../lib/rbac-util'
import { Trans } from '../../../lib/acm-i18next'
import { DOC_LINKS, ViewDocumentationLink } from '../../../lib/doc-util'

export interface IToggleSelectorProps<T = any> {
  keyFn: (item: T) => string
  modalProps: IDeleteResourceModalProps | { open: false }
  table: any
  t: TFunction
  defaultToggleOption?: ApplicationToggleOptions
}
export type ApplicationToggleOptions = 'subscriptions' | 'channels' | 'placements' | 'placementrules'

export function ToggleSelector(props: IToggleSelectorProps) {
  const t = props.t
  const defaultOption = props.defaultToggleOption ?? 'subscriptions'
  const options = [
    { id: 'subscriptions', title: t('Subscriptions'), emptyMessage: t("You don't have any subscriptions") },
    { id: 'channels', title: t('Channels'), emptyMessage: t("You don't have any channels") },
    { id: 'placements', title: t('Placements'), emptyMessage: t("You don't have any placements") },
    { id: 'placementrules', title: t('Placement rules'), emptyMessage: t("You don't have any placement rules") },
  ] as const
  const canCreateApplication = useIsAnyNamespaceAuthorized(rbacCreate(ApplicationDefinition))
  const selectedId = getSelectedId({ location, options, defaultOption, queryParam: 'resources' })
  const selectedResources = _.get(props.table, `${selectedId}`)

  return (
    <AcmTablePaginationContextProvider localStorageKey="advanced-tables-pagination">
      <DeleteResourceModal {...props.modalProps} />
      <AcmTable<IResource>
        showExportButton
        exportFilePrefix={`applicationadvancedconfiguration-${selectedId}`}
        columns={selectedResources.columns}
        keyFn={props.keyFn}
        items={selectedResources.items}
        extraToolbarControls={
          <QuerySwitcher
            key="switcher"
            options={options.map(({ id, title }) => ({
              id,
              contents: title,
            }))}
            defaultOption={defaultOption}
          />
        }
        rowActionResolver={selectedResources.rowActionResolver}
        emptyState={
          <AcmEmptyState
            message={
              selectedId === 'subscriptions' ? (
                <Trans
                  i18nKey="advancedConfiguration.empty.subtitle"
                  components={{ italic: <em />, bold: <strong /> }}
                />
              ) : null
            }
            title={options.find((option) => option.id === selectedId)?.emptyMessage || ''}
            action={
              <Stack>
                {selectedId === 'subscriptions' && (
                  <StackItem>
                    <AcmButton
                      isDisabled={!canCreateApplication}
                      tooltip={!canCreateApplication ? t('rbac.unauthorized') : ''}
                      component={Link}
                      to={NavigationPath.createApplicationSubscription}
                    >
                      {t('Create application')}
                    </AcmButton>
                  </StackItem>
                )}
                <StackItem>
                  <ViewDocumentationLink doclink={DOC_LINKS.MANAGE_APPLICATIONS} />
                </StackItem>
              </Stack>
            }
          />
        }
      />
    </AcmTablePaginationContextProvider>
  )
}

function QuerySwitcher(props: IQuerySwitcherInterface) {
  const { options, defaultOption, queryParam = 'resources' } = props
  const query = queryString.parse(location.search)
  const selectedId = getSelectedId({
    query,
    options,
    defaultOption,
    queryParam,
  })
  const navigate = useNavigate()

  const isSelected = (id: string) => id === selectedId
  const handleChange = (_: any, event: any) => {
    const id = event.currentTarget.id
    if (queryParam) {
      query[queryParam] = id
    }
    const newQueryString = queryString.stringify(query)
    const optionalNewQueryString = newQueryString && `?${newQueryString}`
    navigate(`${location.pathname}${optionalNewQueryString}${location.hash}`)
  }

  return (
    <ToggleGroup>
      {options.map(({ id, contents }) => (
        <ToggleGroupItem
          key={id}
          buttonId={id}
          isSelected={isSelected(id)}
          onChange={(event, _: any) => handleChange(_, event)}
          text={contents}
        />
      ))}
    </ToggleGroup>
  )
}

function getSelectedId<T extends readonly { readonly id: string }[]>(props: {
  location?: Location
  options: T
  defaultOption: T[number]['id']
  queryParam?: string
  query?: queryString.ParsedQuery<string>
}): T[number]['id'] {
  const { options, queryParam, defaultOption, location } = props
  let { query } = props
  if (!query) {
    query = location && queryString.parse(location.search)
  }
  const validOptionIds = options.map((o) => o.id)
  const queryParamValue = query && queryParam ? (query[queryParam] as string) : undefined
  const validQueryParamValue = queryParamValue && validOptionIds.includes(queryParamValue) ? queryParamValue : undefined
  return validQueryParamValue || defaultOption
}

export interface IQuerySwitcherInterface {
  options: { id: string; contents: string }[]
  defaultOption: string
  queryParam?: string
}
