import { ulid } from "ulid";
import { Mode, Type, Msg_ } from "./Component/ProfilesTable"
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Msg } from './Admin'
import React from 'react';

const endpoint = "/api/v1/profiles"
async function getProfiles(url: string): Promise<Profile[]> {

    const response = await fetch(endpoint);
    const json = await response.json();
    const entries: [string, ProfileJson][] = Object.entries(json.ressources)
    const decodedEntries = entries.map(([key, val]) => decodeProfile(key, val))
    return decodedEntries
}

function mapProfiles(ressources: any) {
    const profiles: [string, ProfileJson][] = Object.entries(ressources);
    const mapped_users = profiles.map(([key, val]) => { return (decodeProfile(key, val)) });

    return mapped_users;
}

export async function saveProfile(body: Profile, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>) {
    try {
        const response = await fetch(endpoint, { method: mode === Mode.Edition ? "put" : "post", body: JSON.stringify({ [body.id]: body }, null, '\t'), headers: { 'Content-Type': 'application/json' } });
        const { message, ressources } = await response.json()
        if (response.status === 200) {
            updateModel({ type: 'ServerRespondedWithProfiles', payload: success(mapProfiles(ressources)) })
            updateLocal({ type: Type.UserClickedModal, payload: false })
            updateLocal({ type: Type.ResetProfile, payload: mode })
        } else {
            updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(`${response.status}, ${message}`) })
        }
    } catch (e) {
        updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(`Uncatched : ${e}`) })
    }
}
async function deleteProfile(profile: Profile, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${profile.id}`, { method: "delete" })
        const { message, ressources } = await response.json()
        if (response.status === 200) {
            updateModel({ type: 'ServerRespondedWithProfiles', payload: success(mapProfiles(ressources)) })
        } else {
            updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(`${response.status}, ${message}`) })
        }
    }
    catch (e) {
        updateModel({ type: 'ServerRespondedWithProfiles', payload: failure(`Uncatched Error : ${e}`) })
    };
}


export async function putProfiles(body: Profile[]): Promise<Profile[]> {

    const usersToObject = body.reduce((obj, item) => ({ ...obj, [item.name]: item }), {});
    const response = await fetch("/profiles", { method: "put", body: JSON.stringify(usersToObject, null, '\t'), headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    const entries: [string, ProfileJson][] = Object.entries(json);
    const decodedEntries = entries.map(([key, val]) => decodeProfile(key, val))

    return decodedEntries
}

type ProfileJson = {
    id?: string,
    name?: string,
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string[];
    forbiddenTools: string[];
    blender: Blender;
}

type Blender = {
    contextMenuActionStartLevel: number;
}


const decodeProfile = (key: string, profile: ProfileJson): Profile => {
    return {
        name: profile.name ? profile.name : key,
        _type: 'profile',
        id: profile.id ? profile.id : ulid(),
        allowedSourceSchemas: profile.allowedSourceSchemas,
        allowedSources: profile.allowedSources,
        forbiddenSources: profile.forbiddenSources,
        allowedTools: profile.allowedTools,
        forbiddenTools: profile.forbiddenTools,
        blender: { contextMenuActionStartLevel: profile.blender.contextMenuActionStartLevel }
    }
}


type Profile = {
    name: string,
    _type: string,
    id: string,
    allowedSourceSchemas: string[];
    allowedSources: string | string[];
    forbiddenSources: string | string[];
    allowedTools: string | string[];
    forbiddenTools: string[];
    blender: Blender;
}


export const defaultProfile = (uuid: string): Profile => {
    return ({
        name: "",
        _type: 'profile',
        id: uuid,
        allowedSourceSchemas: [],
        allowedSources: "ALL",
        forbiddenSources: [],
        allowedTools: "ALL",
        forbiddenTools: [],
        blender: { contextMenuActionStartLevel: 0 }
    }
    )
}
const test = {
    "admin": {
        "allowedSourceSchemas": [
            "SKOS",
            "OWL",
            "INDIVIDUALS"
        ],
        "allowedSources": "ALL",
        "forbiddenSources": [
            "Dbpedia"
        ],
        "allowedTools": "ALL",
        "forbiddenTools": [],
        "blender": {
            "contextMenuActionStartLevel": 0
        }
    }
}



export { getProfiles, deleteProfile, Profile }