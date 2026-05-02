/**
 * BodyModel3D — Interactive 3D body model
 *
 * Renders a stylized humanoid body using Three.js / React Three Fiber.
 * The model dynamically morphs based on BodySimulationParams.
 *
 * Features:
 *   - Gender-aware body proportions
 *   - Touch gestures for rotate and zoom
 *   - Smooth transitions between parameter states
 *   - Muscle definition and body fat visualization via materials
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import { BodySimulationParams } from '@/src/types';
import { Colors } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────

interface BodyModel3DProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
    autoRotate?: boolean;
}

interface BodyPartProps {
    position: [number, number, number];
    scale: [number, number, number];
    color: THREE.Color;
    emissive: THREE.Color;
    emissiveIntensity: number;
}

// ─── Helpers ────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

// ─── Body Part Components ───────────────────────────────────

function Torso({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    
    return (
        <mesh ref={meshRef} position={position} scale={scale}>
            <capsuleGeometry args={[0.35, 1.0, 8, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                roughness={0.6}
                metalness={0.1}
            />
        </mesh>
    );
}

function Head({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                roughness={0.5}
                metalness={0.1}
            />
        </mesh>
    );
}

function Limb({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <capsuleGeometry args={[0.12, 0.6, 6, 12]} />
            <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                roughness={0.6}
                metalness={0.1}
            />
        </mesh>
    );
}

function LowerLimb({ position, scale, color, emissive, emissiveIntensity }: BodyPartProps) {
    return (
        <mesh position={position} scale={scale}>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                roughness={0.6}
                metalness={0.1}
            />
        </mesh>
    );
}

// ─── Full Body Mesh ─────────────────────────────────────────

interface HumanoidBodyProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    accentColor: string;
    autoRotate: boolean;
}

function HumanoidBody({ params, gender, accentColor, autoRotate }: HumanoidBodyProps) {
    const groupRef = useRef<THREE.Group>(null);
    const isFemale = gender === 'female';
    
    // Animate auto-rotation
    useFrame((state, delta) => {
        if (groupRef.current && autoRotate) {
            groupRef.current.rotation.y += delta * 0.3;
        }
    });

    // Calculate body proportions from params
    const bodyProps = useMemo(() => {
        const { shoulderWidth, chestWidth, waistWidth, hipWidth, armSize, legSize, muscleTone, bodyFatOverlay } = params;
        
        // Base scales adjusted by params
        const torsoWidthX = lerp(0.7, 1.3, chestWidth);
        const torsoWidthZ = lerp(0.6, 1.0, (chestWidth + waistWidth) / 2);
        const shoulderScale = lerp(0.8, 1.4, shoulderWidth);
        const waistScale = lerp(0.6, 1.2, waistWidth);
        const hipScale = lerp(isFemale ? 0.9 : 0.7, isFemale ? 1.5 : 1.1, hipWidth);
        const armScale = lerp(0.7, 1.5, armSize);
        const legScale = lerp(0.8, 1.4, legSize);
        
        // Color based on muscle tone and body fat
        const baseHue = 0.08; // Skin-ish tone
        const saturation = lerp(0.3, 0.5, muscleTone);
        const lightness = lerp(0.55, 0.45, bodyFatOverlay);
        
        // Parse accent color to RGB
        const accentThree = new THREE.Color(accentColor);
        const bodyColor = new THREE.Color().setHSL(baseHue, saturation, lightness);
        
        // Emissive glow based on muscle definition
        const emissiveColor = accentThree.clone().multiplyScalar(0.3);
        const emissiveIntensity = lerp(0, 0.4, muscleTone);

        return {
            torsoWidthX,
            torsoWidthZ,
            shoulderScale,
            waistScale,
            hipScale,
            armScale,
            legScale,
            bodyColor,
            emissiveColor,
            emissiveIntensity,
        };
    }, [params, accentColor, isFemale]);

    const { torsoWidthX, torsoWidthZ, shoulderScale, waistScale, hipScale, armScale, legScale, bodyColor, emissiveColor, emissiveIntensity } = bodyProps;

    return (
        <group ref={groupRef}>
            {/* Head */}
            <Head
                position={[0, 1.9, 0]}
                scale={[1, 1, 1]}
                color={bodyColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity * 0.5}
            />
            
            {/* Neck */}
            <mesh position={[0, 1.6, 0]} scale={[0.6, 0.3, 0.6]}>
                <cylinderGeometry args={[0.12, 0.15, 0.3, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Upper Torso (Chest/Shoulders) */}
            <Torso
                position={[0, 1.1, 0]}
                scale={[torsoWidthX * shoulderScale, 0.7, torsoWidthZ]}
                color={bodyColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
            />

            {/* Lower Torso (Waist) */}
            <mesh position={[0, 0.5, 0]} scale={[torsoWidthX * waistScale * 0.85, 0.5, torsoWidthZ * 0.9]}>
                <capsuleGeometry args={[0.3, 0.4, 6, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Hips / Pelvis */}
            <mesh position={[0, 0.05, 0]} scale={[hipScale, 0.35, torsoWidthZ * 0.95]}>
                <sphereGeometry args={[0.35, 12, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Left Arm - Upper */}
            <Limb
                position={[-0.55 * shoulderScale, 1.15, 0]}
                scale={[armScale, 1, armScale]}
                color={bodyColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
            />
            
            {/* Left Arm - Lower */}
            <LowerLimb
                position={[-0.55 * shoulderScale, 0.55, 0]}
                scale={[armScale * 0.85, 1, armScale * 0.85]}
                color={bodyColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
            />

            {/* Right Arm - Upper */}
            <Limb
                position={[0.55 * shoulderScale, 1.15, 0]}
                scale={[armScale, 1, armScale]}
                color={bodyColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
            />
            
            {/* Right Arm - Lower */}
            <LowerLimb
                position={[0.55 * shoulderScale, 0.55, 0]}
                scale={[armScale * 0.85, 1, armScale * 0.85]}
                color={bodyColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
            />

            {/* Left Leg - Upper (Thigh) */}
            <mesh position={[-0.22 * hipScale, -0.45, 0]} scale={[legScale, 1, legScale]}>
                <capsuleGeometry args={[0.14, 0.55, 8, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Left Leg - Lower (Calf) */}
            <mesh position={[-0.22 * hipScale, -1.15, 0]} scale={[legScale * 0.8, 1, legScale * 0.8]}>
                <capsuleGeometry args={[0.11, 0.5, 6, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Right Leg - Upper (Thigh) */}
            <mesh position={[0.22 * hipScale, -0.45, 0]} scale={[legScale, 1, legScale]}>
                <capsuleGeometry args={[0.14, 0.55, 8, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Right Leg - Lower (Calf) */}
            <mesh position={[0.22 * hipScale, -1.15, 0]} scale={[legScale * 0.8, 1, legScale * 0.8]}>
                <capsuleGeometry args={[0.11, 0.5, 6, 12]} />
                <meshStandardMaterial
                    color={bodyColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.6}
                />
            </mesh>

            {/* Feet */}
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

// ─── Scene Setup ────────────────────────────────────────────

interface SceneProps {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    accentColor: string;
    autoRotate: boolean;
}

function Scene({ params, gender, accentColor, autoRotate }: SceneProps) {
    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
            <directionalLight position={[-5, 5, -5]} intensity={0.4} />
            <pointLight position={[0, 3, 3]} intensity={0.5} color={accentColor} />
            
            {/* Body model */}
            <HumanoidBody
                params={params}
                gender={gender}
                accentColor={accentColor}
                autoRotate={autoRotate}
            />
            
            {/* Controls */}
            <OrbitControls
                enableZoom={true}
                enablePan={false}
                minDistance={2.5}
                maxDistance={8}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 1.3}
                enableDamping
                dampingFactor={0.05}
            />
        </>
    );
}

// ─── Main Component ─────────────────────────────────────────

export default function BodyModel3D({
    params,
    gender,
    size = 340,
    accentColor = Colors.primary,
    autoRotate = false,
}: BodyModel3DProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Small delay to let GL context initialize
        const timer = setTimeout(() => setLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    const aspectRatio = 3 / 4;
    const width = size * aspectRatio;
    const height = size;

    if (error) {
        return (
            <View style={[styles.container, styles.fallback, { width, height }]}>
                <Text style={styles.fallbackText}>3D preview unavailable</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height }]}>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={accentColor} />
                </View>
            )}
            <Canvas
                camera={{ position: [0, 0.5, 4], fov: 45 }}
                style={{ flex: 1 }}
                onCreated={() => setLoading(false)}
                onError={(e: Error) => {
                    console.error('Canvas error:', e);
                    setError(e.message);
                }}
            >
                <Scene
                    params={params}
                    gender={gender}
                    accentColor={accentColor}
                    autoRotate={autoRotate}
                />
            </Canvas>
            
            {/* Interaction hint */}
            <View style={styles.hint}>
                <Text style={styles.hintText}>Drag to rotate • Pinch to zoom</Text>
            </View>
        </View>
    );
}

// ─── Mini Version ───────────────────────────────────────────

export function BodyModel3DMini({
    params,
    gender,
    size = 100,
    accentColor = Colors.primary,
}: {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    size?: number;
    accentColor?: string;
}) {
    return (
        <BodyModel3D
            params={params}
            gender={gender}
            size={size}
            accentColor={accentColor}
            autoRotate={true}
        />
    );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 10,
    },
    fallback: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    fallbackText: {
        color: '#888',
        fontSize: 13,
    },
    hint: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden',
    },
});
