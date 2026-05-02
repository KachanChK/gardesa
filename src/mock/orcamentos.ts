export type BudgetStatus = 'Rascunho' | 'Enviado' | 'Aprovado' | 'Recusado'

export type PaymentMethodKey =
    | 'pix'
    | 'credit'
    | 'debit'
    | 'transfer'
    | 'boleto'
    | 'other'

export interface BudgetClient {
    id: number
    name: string
    email: string
    phone: string
    address: string
    document: string
}

export interface BudgetItem {
    id: string
    itemId: number | null
    description: string
    quantity: string
    unit: string
    customUnit: string
    unitPrice: string
}

export interface Budget {
    id: number
    number: number
    name: string
    clientId: number
    description: string
    status: BudgetStatus
    createdAt: string
    updatedAt: string
    showValuesInPdf: boolean
    totalOverride: string
    validityDate: string
    paymentMethods: PaymentMethodKey[]
    otherPaymentMethod: string
    paymentConditions: string
    observations: string
    items: BudgetItem[]
}

export interface BudgetProfile {
    companyName: string
    email: string
    phone: string
    cnpj: string
    address: string
    logoUrl: string
    defaultPaymentMethods: PaymentMethodKey[]
    defaultPaymentConditions: string
}

export interface BudgetSeedPayload {
    profile: BudgetProfile
    clients: BudgetClient[]
    budgets: Budget[]
    paymentOptions: Array<{ value: PaymentMethodKey; label: string }>
    statusOptions: BudgetStatus[]
    unitOptions: Array<{ value: string; label: string }>
}

export const budgetSeedPayload: BudgetSeedPayload = {
    profile: {
        companyName: 'Eliana Ranzani Paisagismo',
        email: 'erpaisagismo@gmail.com',
        phone: '(19) 99876-5432',
        cnpj: '12.345.678/0001-90',
        address: 'Rua das Acácias, 148 - Vila Botânica, São Paulo - SP',
        logoUrl: '/img/erpaisagismo.jpg',
        defaultPaymentMethods: ['pix', 'transfer'],
        defaultPaymentConditions: '40% na aprovação do orçamento e 60% no início da execução.'
    },
    clients: [
        {
            id: 1,
            name: 'Eduarda Ranzani',
            email: 'eduarda.ranzani@email.com',
            phone: '(11) 98234-1122',
            address: 'Alameda dos Ipês, 32 - Campinas - SP',
            document: '123.456.789-10'
        },
        {
            id: 2,
            name: 'Condomínio Reserva Verde',
            email: 'sindico@reservaverde.com.br',
            phone: '(19) 3322-4400',
            address: 'Av. dos Lagos, 540 - Valinhos - SP',
            document: '44.555.666/0001-11'
        },
        {
            id: 3,
            name: 'Família Santos',
            email: 'contato@familiasantos.com.br',
            phone: '(11) 97777-8899',
            address: 'Rua dos Manacás, 90 - Jundiaí - SP',
            document: '987.654.321-00'
        },
        {
            id: 4,
            name: 'Casa Aurora Eventos',
            email: 'operacao@casaaurora.com.br',
            phone: '(11) 4002-3200',
            address: 'Estrada da Serra, 875 - Itupeva - SP',
            document: '21.765.098/0001-44'
        },
        {
            id: 5,
            name: 'Lucas Almeida',
            email: 'lucas.almeida@email.com',
            phone: '(11) 98811-2233',
            address: 'Rua das Palmeiras, 120 - Campinas - SP',
            document: '321.654.987-00'
        },
        {
            id: 6,
            name: 'Mariana Costa',
            email: 'mariana.costa@email.com',
            phone: '(19) 99122-3344',
            address: 'Av. Brasil, 455 - Paulínia - SP',
            document: '456.789.123-11'
        },
        {
            id: 7,
            name: 'Empresa Soluções Tech LTDA',
            email: 'contato@solucoestech.com.br',
            phone: '(11) 3333-2211',
            address: 'Rua Tecnológica, 999 - São Paulo - SP',
            document: '12.345.678/0001-90'
        },
        {
            id: 8,
            name: 'Rafael Mendes',
            email: 'rafael.mendes@email.com',
            phone: '(19) 99887-6655',
            address: 'Rua do Comércio, 210 - Sumaré - SP',
            document: '852.963.741-22'
        },
        {
            id: 9,
            name: 'Juliana Ferreira',
            email: 'juliana.ferreira@email.com',
            phone: '(11) 97654-3322',
            address: 'Rua das Acácias, 88 - Campinas - SP',
            document: '159.753.486-33'
        },
        {
            id: 10,
            name: 'Condomínio Parque das Flores',
            email: 'adm@parquedasflores.com.br',
            phone: '(19) 3456-7788',
            address: 'Av. Central, 1000 - Hortolândia - SP',
            document: '98.765.432/0001-55'
        },
        {
            id: 11,
            name: 'Pedro Henrique Souza',
            email: 'pedro.souza@email.com',
            phone: '(11) 96543-2109',
            address: 'Rua XV de Novembro, 45 - Campinas - SP',
            document: '741.852.963-44'
        },
        {
            id: 12,
            name: 'Beatriz Lima',
            email: 'beatriz.lima@email.com',
            phone: '(19) 99221-3344',
            address: 'Rua das Rosas, 300 - Americana - SP',
            document: '963.258.147-55'
        },
        {
            id: 13,
            name: 'Grupo Nova Era',
            email: 'contato@novaera.com.br',
            phone: '(11) 4002-8922',
            address: 'Av. Paulista, 1500 - São Paulo - SP',
            document: '11.222.333/0001-66'
        },
        {
            id: 14,
            name: 'Gabriel Oliveira',
            email: 'gabriel.oliveira@email.com',
            phone: '(19) 97788-1122',
            address: 'Rua das Oliveiras, 77 - Campinas - SP',
            document: '357.159.258-66'
        },
        {
            id: 15,
            name: 'Fernanda Rocha',
            email: 'fernanda.rocha@email.com',
            phone: '(11) 98877-6655',
            address: 'Rua do Sol, 10 - Vinhedo - SP',
            document: '159.357.258-77'
        },
        {
            id: 16,
            name: 'Clínica Vida Saúde',
            email: 'contato@vidasaude.com.br',
            phone: '(19) 3232-4545',
            address: 'Av. Saúde, 200 - Campinas - SP',
            document: '22.333.444/0001-77'
        },
        {
            id: 17,
            name: 'Thiago Martins',
            email: 'thiago.martins@email.com',
            phone: '(11) 97444-5566',
            address: 'Rua das Hortênsias, 150 - Jundiaí - SP',
            document: '852.456.123-88'
        },
        {
            id: 18,
            name: 'Patrícia Gomes',
            email: 'patricia.gomes@email.com',
            phone: '(19) 99333-2211',
            address: 'Rua Bela Vista, 60 - Campinas - SP',
            document: '951.753.852-99'
        },
        {
            id: 19,
            name: 'Mercado Bom Preço',
            email: 'contato@bombpreco.com.br',
            phone: '(11) 3322-1100',
            address: 'Rua Comercial, 500 - São Paulo - SP',
            document: '33.444.555/0001-88'
        },
        {
            id: 20,
            name: 'André Carvalho',
            email: 'andre.carvalho@email.com',
            phone: '(19) 98899-7766',
            address: 'Rua do Lago, 33 - Paulínia - SP',
            document: '456.123.789-00'
        },
        {
            id: 21,
            name: 'Larissa Teixeira',
            email: 'larissa.teixeira@email.com',
            phone: '(11) 97711-2233',
            address: 'Rua das Orquídeas, 80 - Campinas - SP',
            document: '123.789.456-11'
        },
        {
            id: 22,
            name: 'Auto Peças Rápido LTDA',
            email: 'vendas@autopecasrapido.com.br',
            phone: '(19) 3555-6677',
            address: 'Av. Industrial, 700 - Sumaré - SP',
            document: '44.555.666/0001-99'
        },
        {
            id: 23,
            name: 'Bruno Ribeiro',
            email: 'bruno.ribeiro@email.com',
            phone: '(11) 96666-5544',
            address: 'Rua das Nações, 120 - Campinas - SP',
            document: '741.963.852-22'
        },
        {
            id: 24,
            name: 'Vanessa Duarte',
            email: 'vanessa.duarte@email.com',
            phone: '(19) 99911-2233',
            address: 'Rua Primavera, 210 - Americana - SP',
            document: '852.147.963-33'
        }
    ],
    budgets: [
        {
            id: 1,
            number: 1,
            name: 'Jardim residencial - Família Santos',
            clientId: 3,
            description:
                'Requalificação de jardim frontal e lateral com espécies tropicais de baixa manutenção.',
            status: 'Rascunho',
            createdAt: '2026-04-09T10:12:00.000Z',
            updatedAt: '2026-04-21T18:40:00.000Z',
            showValuesInPdf: false,
            totalOverride: '',
            validityDate: '2026-05-10',
            paymentMethods: ['pix', 'credit'],
            otherPaymentMethod: '',
            paymentConditions: '50% na aprovação e 50% na entrega final.',
            observations:
                'Execução prevista em até 12 dias úteis após aprovação. Irrigação automatizada não inclusa.',
            items: [
                {
                    id: 'item-1',
                    itemId: null,
                    description: 'Projeto executivo de paisagismo',
                    quantity: '1',
                    unit: 'un',
                    customUnit: '',
                    unitPrice: '3200'
                },
                {
                    id: 'item-2',
                    itemId: null,
                    description: 'Fornecimento de espécies ornamentais',
                    quantity: '18',
                    unit: 'un',
                    customUnit: '',
                    unitPrice: '185'
                },
                {
                    id: 'item-3',
                    itemId: null,
                    description: 'Substrato e correção de solo',
                    quantity: '12',
                    unit: 'saco',
                    customUnit: '',
                    unitPrice: '42'
                }
            ]
        },
        {
            id: 2,
            number: 2,
            name: 'Área de convivência - Reserva Verde',
            clientId: 2,
            description:
                'Implantação de canteiros lineares, vasos escultóricos e iluminação cênica na área comum.',
            status: 'Enviado',
            createdAt: '2026-03-28T14:05:00.000Z',
            updatedAt: '2026-04-22T09:30:00.000Z',
            showValuesInPdf: true,
            totalOverride: '24500',
            validityDate: '2026-04-15',
            paymentMethods: ['transfer', 'boleto'],
            otherPaymentMethod: '',
            paymentConditions:
                '30% na assinatura, 40% no início da execução e 30% na entrega da obra.',
            observations:
                'Valores válidos para execução em abril. Equipe trabalha somente em dias úteis, das 8h às 17h.',
            items: [
                {
                    id: 'item-4',
                    itemId: null,
                    description: 'Execução de canteiros drenantes',
                    quantity: '42',
                    unit: 'm²',
                    customUnit: '',
                    unitPrice: '210'
                },
                {
                    id: 'item-5',
                    itemId: null,
                    description: 'Vasos de destaque em fibra',
                    quantity: '6',
                    unit: 'un',
                    customUnit: '',
                    unitPrice: '540'
                },
                {
                    id: 'item-6',
                    itemId: null,
                    description: 'Instalação de iluminação cênica',
                    quantity: '1',
                    unit: 'un',
                    customUnit: '',
                    unitPrice: '6800'
                }
            ]
        },
        {
            id: 3,
            number: 3,
            name: 'Pátio gastronômico - Casa Aurora',
            clientId: 4,
            description:
                'Composição vegetal para acolhimento do pátio externo com foco em experiência noturna.',
            status: 'Aprovado',
            createdAt: '2026-03-14T16:20:00.000Z',
            updatedAt: '2026-04-18T11:12:00.000Z',
            showValuesInPdf: true,
            totalOverride: '',
            validityDate: '2026-04-30',
            paymentMethods: ['pix', 'debit', 'other'],
            otherPaymentMethod: 'Link de pagamento',
            paymentConditions: 'Entrada de 60% e saldo em até 7 dias após a implantação.',
            observations:
                'Inclui visita técnica de acompanhamento após 30 dias. Manutenção recorrente é cobrada à parte.',
            items: [
                {
                    id: 'item-7',
                    itemId: null,
                    description: 'Consultoria de ambientação verde',
                    quantity: '6',
                    unit: 'hora',
                    customUnit: '',
                    unitPrice: '260'
                },
                {
                    id: 'item-8',
                    itemId: null,
                    description: 'Painel botânico modular',
                    quantity: '14',
                    unit: 'm²',
                    customUnit: '',
                    unitPrice: '420'
                }
            ]
        }
    ],
    paymentOptions: [
        { value: 'pix', label: 'Pix' },
        { value: 'credit', label: 'Cartão de crédito' },
        { value: 'debit', label: 'Cartão de débito' },
        { value: 'transfer', label: 'Transferência' },
        { value: 'boleto', label: 'Boleto' },
        { value: 'other', label: 'Outro' }
    ],
    statusOptions: ['Rascunho', 'Enviado', 'Aprovado', 'Recusado'],
    unitOptions: [
        { value: 'm²', label: 'm²' },
        { value: 'un', label: 'un' },
        { value: 'hora', label: 'hora' },
        { value: 'saco', label: 'saco' },
        { value: 'kg', label: 'kg' },
        { value: 'm', label: 'm' },
        { value: 'custom', label: 'Outro' }
    ]
}
