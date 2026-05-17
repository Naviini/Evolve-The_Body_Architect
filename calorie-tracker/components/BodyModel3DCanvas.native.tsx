/**
 * BodyModel3DCanvas.native — Three.js canvas implementation
 *
 * This file is ONLY loaded at runtime when expo-gl is confirmed available
 * (i.e. in a native dev build / EAS build). It is NEVER imported directly.
 * BodyModel3D.native.tsx guards the require() with a try-catch so Expo Go
 * never executes this module.
 */

import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

interface Props {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
    showInteractionHint?: boolean;
}

interface BodyPartProps {
    position: [number, number, number];
    scale: [number, number, number];
    color: THREE.Color;
    emissive: THREE.Color;
    emissiveIntensity: number;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function Head({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.5} metalness={0.1} />
        </mesh>
    );
}

function Torso({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <capsuleGeometry args={[0.35, 1.0, 8, 16]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.6} metalness={0.1} />
        </mesh>
    );
}

function Limb({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <capsuleGeometry args={[0.12, 0.6, 6, 12]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.6} metalness={0.1} />
        </mesh>
    );
}

function LowerLimb({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.6} metalness={0.1} />
        </mesh>
    );
}

function HumanoidBody({ params, gender, accentColor, autoRotate }: {
    params: BodySimulationParams; gender: 'male' | 'female';
    accentColor: string; autoRotate: boolean;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const isFemale = gender === 'female';

    useFrame((_s, delta) => {
        if (groupRef.current && autoRotate) groupRef.current.rotation.y += delta * 0.3;
    });

    const bp = useMemo(() => {
        const { shoulderWidth, chestWidth, waistWidth, hipWidth, armSize, legSize, muscleTone, bodyFatOverlay } = params;
        const torsoWidthX   = lerp(0.7, 1.3, chestWidth);
        const torsoWidthZ   = lerp(0.6, 1.0, (chestWidth + waistWidth) / 2);
        const shoulderScale = lerp(0.8, 1.4, shoulderWidth);
        const waistScale    = lerp(0.6, 1.2, waistWidth);
        const hipScale      = lerp(isFemale ? 0.9 : 0.7, isFemale ? 1.5 : 1.1, hipWidth);
        const armScale      = lerp(0.7, 1.5, armSize);
        const legScale      = lerp(0.8, 1.4, legSize);
        const satFemale = lerp(0.14, 0.38, muscleTone);
        const satMale = lerp(0.3, 0.5, muscleTone);
        const bodyColor = new THREE.Color().setHSL(
            isFemale ? 0.56 : 0.08,
            isFemale ? satFemale : satMale,
            lerp(0.58, 0.4, bodyFatOverlay),
        );
        const emissiveColor = new THREE.Color(accentColor).multiplyScalar(0.3);
        const emissiveIntensity = lerp(0, 0.4, muscleTone);
        return { torsoWidthX, torsoWidthZ, shoulderScale, waistScale, hipScale, armScale, legScale, bodyColor, emissiveColor, emissiveIntensity };
    }, [params, accentColor, isFemale]);

    const { torsoWidthX, torsoWidthZ, shoulderScale, waistScale, hipScale, armScale, legScale, bodyColor, emissiveColor, emissiveIntensity } = bp;

    return (
        <group ref={groupRef}>
            <Head position={[0, 1.9, 0]} scale={[1, 1, 1]} color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity * 0.5} />
            <mesh position={[0, 1.6, 0]} scale={[0.6, 0.3, 0.6]}>
                <cylinderGeometry args={[0.12, 0.15, 0.3, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <Torso position={[0, 1.1, 0]} scale={[torsoWidthX * shoulderScale, 0.7, torsoWidthZ]} color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
            <mesh position={[0, 0.5, 0]} scale={[torsoWidthX * waistScale * 0.85, 0.5, torsoWidthZ * 0.9]}>
                <capsuleGeometry args={[0.3, 0.4, 6, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.05, 0]} scale={[hipScale, 0.35, torsoWidthZ * 0.95]}>
                <sphereGeometry args={[0.35, 12, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <Limb position={[-0.55 * shoulderScale, 1.15, 0]} scale={[armScale, 1, armScale]} color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
            <LowerLimb position={[-0.55 * shoulderScale, 0.55, 0]} scale={[armScale * 0.85, 1, armScale * 0.85]} color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
            <Limb position={[0.55 * shoulderScale, 1.15, 0]} scale={[armScale, 1, armScale]} color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
            <LowerLimb position={[0.55 * shoulderScale, 0.55, 0]} scale={[armScale * 0.85, 1, armScale * 0.85]} color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
            <mesh position={[-0.22 * hipScale, -0.45, 0]} scale={[legScale, 1, legScale]}>
                <capsuleGeometry args={[0.14, 0.55, 8, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <mesh position={[-0.22 * hipScale, -1.15, 0]} scale={[legScale * 0.8, 1, legScale * 0.8]}>
                <capsuleGeometry args={[0.11, 0.5, 6, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <mesh position={[0.22 * hipScale, -0.45, 0]} scale={[legScale, 1, legScale]}>
                <capsuleGeometry args={[0.14, 0.55, 8, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <mesh position={[0.22 * hipScale, -1.15, 0]} scale={[legScale * 0.8, 1, legScale * 0.8]}>
                <capsuleGeometry args={[0.11, 0.5, 6, 12]} />
                <meshStandardMaterial color={bodyColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} roughness={0.6} />
            </mesh>
            <mesh position={[-0.22 * hipScale, -1.55, 0.08]} scale={[0.7, 0.3, 1]}>
                <boxGeometry args={[0.15, 0.08, 0.25]} />
                <meshStandardMaterial color={bodyColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.22 * hipScale, -1.55, 0.08]} scale={[0.7, 0.3, 1]}>
                <boxGeometry args={[0.15, 0.08, 0.25]} />
                <meshStandardMaterial color={bodyColor} roughness={0.7} />
            </mesh>
        </group>
    );
}

export default function BodyModel3DCanvas({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
    showInteractionHint = true,
}: Props) {
    const [loading, setLoading] = useState(true);
    const width  = Math.round(size * 0.75);
    const height = size;
    const accentThree = useMemo(() => new THREE.Color(accentColor), [accentColor]);

    return (
        <View style={[styles.container, { width, height }]}>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={accentColor} />
                </View>
            )}
            <Canvas
                camera={{ position: [0, 0.35, 4.1], fov: 42 }}
                style={{ flex: 1 }}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance',
                }}
                onCreated={({ gl, scene }) => {
                    gl.setClearColor(0x000000, 0);
                    scene.background = null;
                    scene.fog = new THREE.FogExp2(0x070b14, 0.045);
                    setLoading(false);
                }}
            >
                <ambientLight intensity={0.45} />
                <hemisphereLight args={['#c8d4e8', '#1a1410', 0.85]} />
                <directionalLight position={[4, 8, 6]} intensity={1.35} castShadow={false} />
                <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#8090ff" />
                <spotLight
                    position={[0, -0.5, 5]}
                    angle={0.55}
                    penumbra={0.85}
                    intensity={1.1}
                    color={accentColor}
                    decay={2}
                />
                <pointLight position={[0, 2.2, 2.8]} intensity={0.55} color={accentThree} />
                <HumanoidBody params={params} gender={gender} accentColor={accentColor} autoRotate={autoRotate} />
                <OrbitControls
                    enableZoom
                    enablePan={false}
                    minDistance={2.4}
                    maxDistance={8}
                    minPolarAngle={Math.PI / 7}
                    maxPolarAngle={Math.PI / 1.35}
                    enableDamping
                    dampingFactor={0.06}
                />
            </Canvas>
            {showInteractionHint ? (
                <View style={styles.hint}>
                    <Text style={styles.hintText}>Drag to rotate • Pinch to zoom</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { borderRadius: 16, overflow: 'hidden', backgroundColor: 'transparent' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 10,
    },
    hint: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
    hintText: {
        fontSize: 11, color: 'rgba(255,255,255,0.6)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, overflow: 'hidden',
    },
});
