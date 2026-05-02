(function () {
    const STORAGE_KEY = 'gardesa:orcamentos:clients:v1'

    function loadClients(fallbackClients) {
        try {
            const storedValue = window.localStorage.getItem(STORAGE_KEY)
            const source = storedValue ? JSON.parse(storedValue) : fallbackClients
            return normalizeClients(source)
        } catch {
            return normalizeClients(fallbackClients)
        }
    }

    function saveClients(clients) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeClients(clients)))
    }

    function createClient(clients, payload) {
        const normalizedClients = normalizeClients(clients)
        const now = new Date().toISOString()
        const client = normalizeClient({
            ...payload,
            id: getNextClientId(normalizedClients),
            createdAt: now,
            updatedAt: now
        })

        return {
            client,
            clients: [client, ...normalizedClients]
        }
    }

    function updateClient(clients, clientId, payload) {
        const normalizedClients = normalizeClients(clients)
        const now = new Date().toISOString()
        let updatedClient = null
        const nextClients = normalizedClients.map((client) => {
            if (client.id !== clientId) {
                return client
            }

            updatedClient = normalizeClient({
                ...client,
                ...payload,
                id: client.id,
                createdAt: client.createdAt,
                updatedAt: now
            })

            return updatedClient
        })

        return {
            client: updatedClient,
            clients: nextClients
        }
    }

    function deleteClient(clients, clientId) {
        return normalizeClients(clients).filter((client) => client.id !== clientId)
    }

    function sortByNewest(clients) {
        return normalizeClients(clients).sort((firstClient, secondClient) => {
            const firstCreatedAt = getCreatedAtTime(firstClient)
            const secondCreatedAt = getCreatedAtTime(secondClient)

            if (firstCreatedAt !== secondCreatedAt) {
                return secondCreatedAt - firstCreatedAt
            }

            return secondClient.id - firstClient.id
        })
    }

    function normalizeClients(clients) {
        return Array.isArray(clients) ? clients.map((client) => normalizeClient(client)) : []
    }

    function normalizeClient(client) {
        const source = client && typeof client === 'object' && !Array.isArray(client) ? client : {}

        return {
            id: toNumber(source.id),
            name: toStringValue(source.name),
            email: toStringValue(source.email),
            phone: toStringValue(source.phone),
            address: toStringValue(source.address),
            document: toStringValue(source.document),
            createdAt: toStringValue(source.createdAt),
            updatedAt: toStringValue(source.updatedAt)
        }
    }

    function getNextClientId(clients) {
        return normalizeClients(clients).reduce((max, client) => Math.max(max, client.id), 0) + 1
    }

    function getCreatedAtTime(client) {
        const timestamp = Date.parse(client.createdAt)
        return Number.isFinite(timestamp) ? timestamp : 0
    }

    function toStringValue(value) {
        return typeof value === 'string' ? value.trim() : ''
    }

    function toNumber(value) {
        const parsed = Number.parseInt(value, 10)
        return Number.isFinite(parsed) ? parsed : 0
    }

    window.GardesaClientStore = {
        storageKey: STORAGE_KEY,
        loadClients,
        saveClients,
        createClient,
        updateClient,
        deleteClient,
        sortByNewest,
        normalizeClient,
        normalizeClients,
        getNextClientId
    }
})()
