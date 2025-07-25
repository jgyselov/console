/* Copyright Contributors to the Open Cluster Management project */
import {
  consoleFetchJSON,
  K8sResourceCommon,
  useK8sModel,
  useK8sWatchResource,
  WatchK8sResult,
} from '@openshift-console/dynamic-plugin-sdk'
import { useEffect, useMemo, useState } from 'react'

import { FleetK8sResourceCommon, FleetWatchK8sResource } from '../../types'
import { buildResourceURL, fleetWatch } from '../apiRequests'
import { handleWebsocketEvent } from './utils'
import { useFleetK8sAPIPath } from '../useFleetK8sAPIPath'

const fleetResourceCache: Record<string, any> = {}
const fleetSocketCache: Record<string, WebSocket> = {}

const getCacheKey = ({
  model,
  cluster,
  namespace,
  name,
}: {
  model: any
  cluster?: string
  namespace?: string
  name?: string
}) => {
  return [cluster, model?.apiVersion, model?.kind, namespace, name].join('|')
}

export const useFleetK8sWatchResource = <R extends FleetK8sResourceCommon | FleetK8sResourceCommon[]>(
  hubClusterName: string,
  initResource: FleetWatchK8sResource | null
): WatchK8sResult<R> | [undefined, boolean, any] => {
  const { cluster, ...resource } = initResource ?? {}
  const useFleet = cluster && cluster !== hubClusterName
  const nullResource = !initResource || !resource?.groupVersionKind

  const { isList, groupVersionKind, namespace, name } = resource ?? {}
  const [model] = useK8sModel(groupVersionKind)
  const [backendAPIPath, backendPathLoaded] = useFleetK8sAPIPath(cluster)

  const noCachedValue = useMemo(() => (isList ? [] : (undefined as unknown)) as R, [isList])

  const requestPath = useMemo(
    () =>
      backendPathLoaded && model
        ? buildResourceURL({
            model,
            ns: namespace,
            name,
            cluster,
            basePath: backendAPIPath as string,
          })
        : '',

    [model, namespace, name, cluster, backendPathLoaded, backendAPIPath]
  )

  const [data, setData] = useState<R>(fleetResourceCache[requestPath] ?? noCachedValue)
  const [loaded, setLoaded] = useState<boolean>(!!fleetResourceCache[requestPath])
  const [error, setError] = useState<any>(undefined)

  useEffect(() => {
    const fetchData = async () => {
      setError(undefined)
      if (!useFleet || nullResource) {
        setData(noCachedValue)
        setLoaded(false)
        return
      }

      if (!backendPathLoaded || fleetResourceCache[requestPath]) {
        return
      }

      try {
        const data = (await consoleFetchJSON(requestPath, 'GET')) as R

        const processedData = (
          isList
            ? (data as { items: K8sResourceCommon[] }).items.map((i) => ({ cluster, ...i }))
            : { cluster, ...(data as K8sResourceCommon) }
        ) as R

        fleetResourceCache[requestPath] = processedData

        const watchQuery: any = {
          ns: namespace,
          cluster,
        }

        if (name) {
          watchQuery.fieldSelector = `metadata.name=${name}`
        }

        if (isList) {
          watchQuery.resourceVersion = (data as { metadata: { resourceVersion?: string } })?.metadata?.resourceVersion
        }

        const socketKey = getCacheKey({ model, cluster, namespace, name })
        const cachedSocket = fleetSocketCache[socketKey]

        if (!cachedSocket || cachedSocket.readyState !== WebSocket.OPEN) {
          const socket = fleetWatch(model, watchQuery, backendAPIPath as string)

          fleetSocketCache[socketKey] = socket

          socket.onmessage = (event) => {
            try {
              handleWebsocketEvent(event, requestPath, setData, isList, fleetResourceCache, cluster)
            } catch (e) {
              console.error('Failed to parse WebSocket message', e)
            }
          }

          socket.onclose = () => {
            delete fleetSocketCache[socketKey]
          }
        }

        setData(processedData)
      } catch (err) {
        setError(err)
      } finally {
        setLoaded(true)
      }
    }
    fetchData()
  }, [
    cluster,
    isList,
    requestPath,
    name,
    namespace,
    nullResource,
    noCachedValue,
    useFleet,
    backendPathLoaded,
    model,
    backendAPIPath,
  ])

  const [defaultData, defaultLoaded, defaultError] = useK8sWatchResource<R>(useFleet ? null : resource)

  if (nullResource) return [undefined, false, undefined]

  return useFleet
    ? [fleetResourceCache[requestPath] ?? data ?? noCachedValue, fleetResourceCache[requestPath] ? true : loaded, error]
    : [defaultData, defaultLoaded, defaultError]
}
