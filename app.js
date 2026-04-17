// Configuração da API
const API_URL = 'http://localhost:3000';

// Variável global para controlar o paciente atual
let currentPatientId = null;

/**
 * Alterna entre as abas do formulário
 */

function $(id) {
    return document.getElementById(id);
}

function switchTab(event, tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    event.target.classList.add('active');
    $(`tab-${tabName}`).classList.add('active');
}

/**
 * Carrega a lista de todos os pacientes
 */
async function loadPatients() {
    try {
        const response = await fetch(${API_URL}/PatientIDs);
        
        if (response.status === 204) {
            document.getElementById('patientList').innerHTML = 
                '<div class="alert alert-info">Nenhum paciente cadastrado.</div>';
            return;
        }

        const ids = await response.json();
        const patientList = document.getElementById('patientList');
        patientList.innerHTML = '';

        for (const id of ids) {
            const patientResponse = await fetch(${API_URL}/Patient/${id});
            const patient = await patientResponse.json();
            
            const patientItem = createPatientListItem(id, patient);
            patientList.appendChild(patientItem);
        }
    } catch (error) {
        showAlert('Erro ao carregar pacientes: ' + error.message, 'danger');
    }
}

/**
 * Carrega um paciente específico para edição
 */
async function loadPatient(id) {
    try {
        const response = await fetch(${API_URL}/Patient/${id});
        const patient = await response.json();

        currentPatientId = id;
        document.getElementById('patientId').value = id;
        document.getElementById('formTitle').textContent = Editar Paciente #${id};
        document.getElementById('patientForm').style.display = 'block';
        document.getElementById('deleteBtn').style.display = 'block';

        // Preencher formulário com dados do paciente
        fillForm(patient);

        // Marcar item ativo na lista
        updateActivePatientInList();

    } catch (error) {
        showAlert('Erro ao carregar paciente: ' + error.message, 'danger');
    }
}

/**
 * Salva um paciente (cria novo ou atualiza existente)
 */
async function savePatient() {
    try {
        // Validar campos obrigatórios
        const validation = validateForm();
        if (!validation.valid) {
            showAlert(validation.message, 'danger');
            return;
        }

        // Criar objeto Patient conforme FHIR v5.0.0
        const patient = buildPatientObject();

        let response;
        if (currentPatientId) {
            // UPDATE - atualizar paciente existente
            patient.identifier = [{
                system: "http://patientsonfire.example.com/patient-id",
                value: currentPatientId.toString()
            }];
            response = await fetch(${API_URL}/Patient/${currentPatientId}, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patient)
            });
        } else {
            // CREATE - criar novo paciente
            response = await fetch(${API_URL}/Patient, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patient)
            });
        }

        if (response.ok) {
            showAlert(
                currentPatientId ? 'Paciente atualizado com sucesso!' : 'Paciente criado com sucesso!', 
                'success'
            );
            loadPatients();
            if (!currentPatientId) {
                newPatient();
            }
        } else {
            const error = await response.json();
            showAlert('Erro: ' + error.message, 'danger');
        }

    } catch (error) {
        showAlert('Erro ao salvar paciente: ' + error.message, 'danger');
    }
}

/**
 * Exclui um paciente
 */
async function deletePatient() {
    if (!currentPatientId) return;

    if (!confirm(Tem certeza que deseja excluir o paciente #${currentPatientId}?)) {
        return;
    }

    try {
        const response = await fetch(${API_URL}/Patient/${currentPatientId}, {
            method: 'DELETE'
        });

        if (response.ok || response.status === 204) {
            showAlert('Paciente excluído com sucesso!', 'success');
            newPatient();
            loadPatients();
        } else {
            showAlert('Erro ao excluir paciente', 'danger');
        }

    } catch (error) {
        showAlert('Erro ao excluir paciente: ' + error.message, 'danger');
    }
}

/**
 * Prepara formulário para criar novo paciente
 */
function newPatient() {
    currentPatientId = null;
    document.getElementById('patientId').value = '';
    document.getElementById('formTitle').textContent = 'Novo Paciente';
    document.getElementById('patientForm').style.display = 'block';
    document.getElementById('deleteBtn').style.display = 'none';
    
    // Limpar formulário
    clearForm();

    // Remover seleção ativa
    document.querySelectorAll('.patient-item').forEach(item => {
        item.classList.remove('active');
    });

    // Voltar para primeira aba
    switchTabProgrammatically('basic');
}

/**
 * Valida os campos obrigatórios do formulário
 */
function validateForm() {
    const givenName = document.getElementById('givenName').value.trim();
    const familyName = document.getElementById('familyName').value.trim();
    const gender = document.getElementById('gender').value;
    const birthDate = document.getElementById('birthDate').value;

    if (!givenName || !familyName || !gender || !birthDate) {
        return {
            valid: false,
            message: 'Por favor, preencha todos os campos obrigatórios (*) na aba "Dados Básicos"'
        };
    }

    return { valid: true };
}

/**
 * Constrói objeto Patient conforme padrão FHIR v5.0.0 COMPLETO
 */
function buildPatientObject() {
    const patient = {
        resourceType: 'Patient'
    };

    // Active
    const active = document.getElementById('active').checked;
    if (active !== undefined) {
        patient.active = active;
    }

    // Name (obrigatório)
    patient.name = [{
        given: document.getElementById('givenName').value.trim().split(' '),
        family: document.getElementById('familyName').value.trim()
    }];

    // Gender (obrigatório)
    patient.gender = document.getElementById('gender').value;

    // BirthDate (obrigatório)
    patient.birthDate = document.getElementById('birthDate').value;

    // Deceased
    const deceasedBoolean = document.getElementById('deceasedBoolean').checked;
    const deceasedDateTime = document.getElementById('deceasedDateTime').value;
    
    if (deceasedDateTime) {
        patient.deceasedDateTime = deceasedDateTime;
    } else if (deceasedBoolean) {
        patient.deceasedBoolean = true;
    }

    // Marital Status
    const maritalStatus = document.getElementById('maritalStatus').value;
    if (maritalStatus) {
        patient.maritalStatus = {
            coding: [{
                system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                code: maritalStatus
            }]
        };
    }

    // Multiple Birth
    const multipleBirthInteger = document.getElementById('multipleBirthInteger').value;
    if (multipleBirthInteger) {
        patient.multipleBirthInteger = parseInt(multipleBirthInteger);
    }

    // Telecom (telefone e email)
    patient.telecom = [];
    const phone = document.getElementById('phone').value.trim();
    if (phone) {
        patient.telecom.push({
            system: 'phone',
            value: phone,
            use: 'mobile'
        });
    }

    const email = document.getElementById('email').value.trim();
    if (email) {
        patient.telecom.push({
            system: 'email',
            value: email,
            use: 'home'
        });
    }

    // Address
    const addressLine = document.getElementById('addressLine').value.trim();
    const addressCity = document.getElementById('addressCity').value.trim();
    const addressState = document.getElementById('addressState').value.trim();
    const addressPostalCode = document.getElementById('addressPostalCode').value.trim();
    const addressCountry = document.getElementById('addressCountry').value.trim();

    if (addressLine || addressCity || addressState || addressPostalCode || addressCountry) {
        patient.address = [{
            use: 'home',
            line: addressLine ? [addressLine] : undefined,
            city: addressCity || undefined,
            state: addressState || undefined,
            postalCode: addressPostalCode || undefined,
            country: addressCountry || undefined
        }];
    }

    // Photo
    const photoUrl = document.getElementById('photoUrl').value.trim();
    if (photoUrl) {
        patient.photo = [{
            url: photoUrl
        }];
    }

    // Contact (contato de emergência)
    const contactName = document.getElementById('contactName').value.trim();
    const contactRelationship = document.getElementById('contactRelationship').value;
    const contactPhone = document.getElementById('contactPhone').value.trim();
    const contactGender = document.getElementById('contactGender').value;

    if (contactName || contactRelationship || contactPhone) {
        patient.contact = [{
            relationship: contactRelationship ? [{
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                    code: contactRelationship
                }]
            }] : undefined,
            name: contactName ? {
                text: contactName
            } : undefined,
            telecom: contactPhone ? [{
                system: 'phone',
                value: contactPhone
            }] : undefined,
            gender: contactGender || undefined
        }];
    }

    // Communication
    const language = document.getElementById('language').value;
    const languagePreferred = document.getElementById('languagePreferred').checked;

    if (language) {
        patient.communication = [{
            language: {
                coding: [{
                    system: "urn:ietf:bcp:47",
                    code: language
                }]
            },
            preferred: languagePreferred || undefined
        }];
    }

    // General Practitioner
    const generalPractitioner = document.getElementById('generalPractitioner').value.trim();
    if (generalPractitioner) {
        patient.generalPractitioner = [{
            display: generalPractitioner
        }];
    }

    // Managing Organization
    const managingOrganization = document.getElementById('managingOrganization').value.trim();
    if (managingOrganization) {
        patient.managingOrganization = {
            display: managingOrganization
        };
    }

    return patient;
}

/**
 * Preenche o formulário com dados do paciente
 */
function fillForm(patient) {
    // Active
    document.getElementById('active').checked = patient.active !== false;

    // Name
    if (patient.name && patient.name[0]) {
        document.getElementById('givenName').value = 
            patient.name[0].given ? patient.name[0].given.join(' ') : '';
        document.getElementById('familyName').value = 
            patient.name[0].family || '';
    }

    // Gender e Birth Date
    document.getElementById('gender').value = patient.gender || '';
    document.getElementById('birthDate').value = patient.birthDate || '';

    // Deceased
    if (patient.deceasedBoolean) {
        document.getElementById('deceasedBoolean').checked = true;
    }
    if (patient.deceasedDateTime) {
        document.getElementById('deceasedDateTime').value = patient.deceasedDateTime;
    }

    // Marital Status
    if (patient.maritalStatus && patient.maritalStatus.coding && patient.maritalStatus.coding[0]) {
        document.getElementById('maritalStatus').value = patient.maritalStatus.coding[0].code || '';
    }

    // Multiple Birth
    if (patient.multipleBirthInteger) {
        document.getElementById('multipleBirthInteger').value = patient.multipleBirthInteger;
    }

    // Telecom
    if (patient.telecom) {
        const phone = patient.telecom.find(t => t.system === 'phone');
        const email = patient.telecom.find(t => t.system === 'email');
        document.getElementById('phone').value = phone ? phone.value : '';
        document.getElementById('email').value = email ? email.value : '';
    }

    // Address
    if (patient.address && patient.address[0]) {
        const addr = patient.address[0];
        document.getElementById('addressLine').value = addr.line ? addr.line.join(', ') : '';
        document.getElementById('addressCity').value = addr.city || '';
        document.getElementById('addressState').value = addr.state || '';
        document.getElementById('addressPostalCode').value = addr.postalCode || '';
        document.getElementById('addressCountry').value = addr.country || '';
    }

    // Photo
    if (patient.photo && patient.photo[0] && patient.photo[0].url) {
        document.getElementById('photoUrl').value = patient.photo[0].url;
    }

    // Contact
    if (patient.contact && patient.contact[0]) {
        const contact = patient.contact[0];
        
        if (contact.name && contact.name.text) {
            document.getElementById('contactName').value = contact.name.text;
        }
        
        if (contact.relationship && contact.relationship[0] && contact.relationship[0].coding && contact.relationship[0].coding[0]) {
            document.getElementById('contactRelationship').value = contact.relationship[0].coding[0].code || '';
        }
        
        if (contact.telecom && contact.telecom[0]) {
            document.getElementById('contactPhone').value = contact.telecom[0].value || '';
        }
        
        if (contact.gender) {
            document.getElementById('contactGender').value = contact.gender;
        }
    }

    // Communication
    if (patient.communication && patient.communication[0]) {
        const comm = patient.communication[0];
        if (comm.language && comm.language.coding && comm.language.coding[0]) {
            document.getElementById('language').value = comm.language.coding[0].code || '';
        }
        document.getElementById('languagePreferred').checked = comm.preferred || false;
    }

    // General Practitioner
    if (patient.generalPractitioner && patient.generalPractitioner[0]) {
        document.getElementById('generalPractitioner').value = patient.generalPractitioner[0].display || '';
    }

    // Managing Organization
    if (patient.managingOrganization) {
        document.getElementById('managingOrganization').value = patient.managingOrganization.display || '';
    }
}

/**
 * Limpa todos os campos do formulário
 */
function clearForm() {
    document.getElementById('active').checked = true;
    document.getElementById('givenName').value = '';
    document.getElementById('familyName').value = '';
    document.getElementById('gender').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('deceasedBoolean').checked = false;
    document.getElementById('deceasedDateTime').value = '';
    document.getElementById('maritalStatus').value = '';
    document.getElementById('multipleBirthInteger').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('addressLine').value = '';
    document.getElementById('addressCity').value = '';
    document.getElementById('addressState').value = '';
    document.getElementById('addressPostalCode').value = '';
    document.getElementById('addressCountry').value = '';
    document.getElementById('photoUrl').value = '';
    document.getElementById('contactName').value = '';
    document.getElementById('contactRelationship').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactGender').value = '';
    document.getElementById('language').value = '';
    document.getElementById('languagePreferred').checked = false;
    document.getElementById('generalPractitioner').value = '';
    document.getElementById('managingOrganization').value = '';
}

/**
 * Cria um elemento HTML para item da lista de pacientes
 */
function createPatientListItem(id, patient) {
    const patientItem = document.createElement('div');
    patientItem.className = 'patient-item';
    patientItem.onclick = () => loadPatient(id);
    
    const name = patient.name && patient.name[0] ? 
        ${patient.name[0].given ? patient.name[0].given.join(' ') : ''} ${patient.name[0].family || ''} : 
        'Nome não informado';
    
    const activeStatus = patient.active === false ? ' 🔴' : ' 🟢';
    
    patientItem.innerHTML = 
        <strong>ID: ${id}${activeStatus}</strong>
        <div>${name}</div>
        <small>${patient.gender || 'Gênero não informado'} | ${patient.birthDate || 'Data não informada'}</small>
    ;
    
    return patientItem;
}

/**
 * Atualiza a marcação visual do paciente ativo na lista
 */
function updateActivePatientInList() {
    document.querySelectorAll('.patient-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(ID: ${currentPatientId})) {
            item.classList.add('active');
        }
    });
}

/**
 * Alterna aba programaticamente
 */
function switchTabProgrammatically(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(.tab-button:nth-child(${tabName === 'basic' ? 1 : tabName === 'contact' ? 2 : 3})).classList.add('active');
    document.getElementById(tab-${tabName}).classList.add('active');
}

/**
 * Exibe mensagem de alerta para o usuário
 */
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = <div class="alert alert-${type}">${message}</div>;
    
    // Remover alerta após 5 segundos
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

/**
 * Visualiza o JSON do paciente atual
 */
function viewJSON() {
    const patient = buildPatientObject();
    
    if (currentPatientId) {
        patient.identifier = [{
            system: "http://patientsonfire.example.com/patient-id",
            value: currentPatientId.toString()
        }];
        patient.id = currentPatientId.toString();
    }
    
    const jsonOutput = document.getElementById('jsonOutput');
    jsonOutput.textContent = JSON.stringify(patient, null, 2);
    
    document.getElementById('jsonModal').style.display = 'block';
}

/**
 * Copia o JSON para a área de transferência
 */
function copyJSON() {
    const jsonText = document.getElementById('jsonOutput').textContent;
    navigator.clipboard.writeText(jsonText).then(() => {
        showAlert('JSON copiado para a área de transferência!', 'success');
    }).catch(err => {
        showAlert('Erro ao copiar JSON: ' + err.message, 'danger');
    });
}

/**
 * Fecha o modal de JSON
 */
function closeModal() {
    document.getElementById('jsonModal').style.display = 'none';
}

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('jsonModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}
/**
 * Função executada quando a página carrega
 */
window.onload = function() {
    loadPatients();
};